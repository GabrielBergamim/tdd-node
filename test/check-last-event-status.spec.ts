import { set, reset } from 'mockdate';

class EventStatus {
  status: 'active' | 'inReview' | 'done';

  constructor(event?: EventModel) {
    if (!event) {
      this.status = 'done';
      return;
    }

    const now = new Date();

    if (event.endDate >= now) {
      this.status = 'active';
      return;
    }

    const reviewDate = new Date(
      event.endDate.getTime() + event.reviewDurationInHours * 60 * 60 * 100
    );

    if (reviewDate >= now) {
      this.status = 'inReview';
      return
    }

    this.status = 'done';
  }
}

class CheckLastEventStatus {
  constructor(
    private readonly loadLastEventRepository: LoadLastEventRepository
  ) {}

  async perform({ groupId }: { groupId: string }): Promise<EventStatus> {
    const event = await this.loadLastEventRepository.loadLastEvent({ groupId });

    return new EventStatus(event);
  }
}

interface EventModel {
  endDate: Date;
  reviewDurationInHours: number;
}

interface LoadLastEventRepository {
  loadLastEvent: (input: {
    groupId: string;
  }) => Promise<EventModel | undefined>;
}

class LoadLastEventRepositorySpy implements LoadLastEventRepository {
  groupId?: string;
  output?: EventModel;

  setEndDateAfterNow() {
    this.output = {
      endDate: new Date(new Date().getTime() + 1),
      reviewDurationInHours: 1,
    };
  }

  setEndDateEqualsNow() {
    this.output = {
      endDate: new Date(),
      reviewDurationInHours: 1,
    };
  }

  setEndDateBeforeNow() {
    this.output = {
      endDate: new Date(new Date().getTime() - 1),
      reviewDurationInHours: 1,
    };
  }

  setEndDateBeforeReviewDate() {
    const reviewDurationInHours = 1;
    const reviewDurationInMs = reviewDurationInHours * 60 * 60 * 100;
    this.output = {
      endDate: new Date(new Date().getTime() - reviewDurationInMs + 1),
      reviewDurationInHours,
    };
  }

  setEndDateEqualToReviewDate() {
    const reviewDurationInHours = 1;
    const reviewDurationInMs = reviewDurationInHours * 60 * 60 * 100;
    this.output = {
      endDate: new Date(new Date().getTime() - reviewDurationInMs),
      reviewDurationInHours,
    };
  }

  setEndDateAfterReviewDate() {
    const reviewDurationInHours = 1;
    const reviewDurationInMs = reviewDurationInHours * 60 * 60 * 100;
    this.output = {
      endDate: new Date(new Date().getTime() - reviewDurationInMs - 1),
      reviewDurationInHours,
    };
  }

  async loadLastEvent({
    groupId,
  }: {
    groupId: string;
  }): Promise<EventModel | undefined> {
    this.groupId = groupId;

    return this.output;
  }
}

const makeSut = () => {
  const loadLastEventRepository = new LoadLastEventRepositorySpy();
  const sut = new CheckLastEventStatus(loadLastEventRepository);

  return { sut, loadLastEventRepository };
};

describe('CheckLastEventStatus', () => {
  const groupId = 'any_group_id';

  beforeAll(() => {
    set(new Date());
  });

  afterAll(() => {
    reset();
  });

  it('should get last event data', async () => {
    const { sut, loadLastEventRepository } = makeSut();

    await sut.perform({ groupId });

    expect(loadLastEventRepository.groupId).toBe('any_group_id');
  });

  it('should return status done when group has no event', async () => {
    const { sut, loadLastEventRepository } = makeSut();
    loadLastEventRepository.output = undefined;

    const { status } = await sut.perform({ groupId });

    expect(status).toBe('done');
  });

  it('should return status active when now is before event end time', async () => {
    const { sut, loadLastEventRepository } = makeSut();
    loadLastEventRepository.setEndDateAfterNow();

    const { status } = await sut.perform({ groupId });

    expect(status).toBe('active');
  });

  it('should return status active when now is equal to event end time', async () => {
    const { sut, loadLastEventRepository } = makeSut();
    loadLastEventRepository.setEndDateEqualsNow();

    const { status } = await sut.perform({ groupId });

    expect(status).toBe('active');
  });

  it('should return status inReview when now is after event end time', async () => {
    const { sut, loadLastEventRepository } = makeSut();
    loadLastEventRepository.setEndDateBeforeNow();

    const { status } = await sut.perform({ groupId });

    expect(status).toBe('inReview');
  });

  it('should return status inReview when now is before event review time', async () => {
    const { sut, loadLastEventRepository } = makeSut();
    loadLastEventRepository.setEndDateBeforeReviewDate();

    const { status } = await sut.perform({ groupId });

    expect(status).toBe('inReview');
  });

  it('should return status inReview when now is equal to event review time', async () => {
    const { sut, loadLastEventRepository } = makeSut();
    loadLastEventRepository.setEndDateEqualToReviewDate();

    const { status } = await sut.perform({ groupId });

    expect(status).toBe('inReview');
  });

  it('should return status inReview when now is after to event review time', async () => {
    const { sut, loadLastEventRepository } = makeSut();
    loadLastEventRepository.setEndDateAfterReviewDate();

    const { status } = await sut.perform({ groupId });

    expect(status).toBe('done');
  });
});
