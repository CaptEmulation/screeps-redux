import runTasks from './tasks';

describe('tasks', () => {
  function fakeCreep(withTask) {
    return {
      memory: {
        tasks: Array.isArray(withTask) ? withTask : [withTask],
      }
    }
  }


  it('runs single task', () => {
    const prePri = jest.fn();
    const preDone = jest.fn();
    const postDone = jest.fn();
    runTasks({
      memory: {
        tasks: [{ action: 'test' }]
      }
    }, {
      test: function *(target, { priority, done }) {
        prePri();
        yield priority();
        preDone();
        yield done();
        postDone();
      },
    });

    expect(prePri).toHaveBeenCalledTimes(1);
    expect(preDone).toHaveBeenCalledTimes(1);
    expect(postDone).toHaveBeenCalledTimes(0);
  });

  it('runs sub task', () => {
    const prePri = jest.fn();
    const preDone = jest.fn();
    const postDone = jest.fn();
    const prePri1 = jest.fn();
    const end = jest.fn();

    runTasks({
      memory: {
        tasks: [{
          action: 'test',
          subTask: {
            action: 'test1',
          }
        }]
      }
    }, {
      test: function *(target, { priority, done }) {
        prePri();
        yield priority();
        preDone();
        yield done();
        postDone();
      },
      test1: function *(target, { priority, done }) {
        prePri1();
        yield priority();
        end();
      },
    });

    expect(prePri).toHaveBeenCalledTimes(0);
    expect(preDone).toHaveBeenCalledTimes(0);
    expect(postDone).toHaveBeenCalledTimes(0);
    expect(prePri1).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('runs sub sub task', () => {
    const prePri = jest.fn();
    const prePri1 = jest.fn();
    const prePri2 = jest.fn();
    const end = jest.fn();
    runTasks({
      memory: {
        tasks: [{
          action: 'test',
          subTask: {
            action: 'test1',
            subTask: {
              action: 'test2'
            }
          }
        }]
      }
    }, {
      test: function *(target, { priority, done }) {
        prePri();
        yield priority();
        yield done();
      },
      test1: function *(target, { priority, done }) {
        prePri1();
        yield priority();
        yield done();
      },
      test2: function *(target, { priority, done }) {
        prePri2();
        yield priority();
        end();
      },
    });

    expect(prePri).toHaveBeenCalledTimes(0);
    expect(prePri1).toHaveBeenCalledTimes(0);
    expect(prePri2).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('prototypes context', () => {
    runTasks({
      memory: {
        tasks: [{
          action: 'test',
          foo: 'bar',
          subTask: {
            action: 'test1',
          }
        }]
      }
    }, {
       test: function *(target, { priority, context }) {
        expect(context.foo).toEqual('bar');
        yield priority();
      },
      test1: function *(target, { priority, context }) {
        yield priority();
        expect(context.foo).toEqual('bar');
      },
    });
  });

  it('can sleep', () => {
    const tasks = {
      sleeps: jest.fn(function* (target, {
        sleep,
      }) {
        yield sleep();
        throw new Error('should not end up here');
      }),
      run: jest.fn(function* (target, {
        priority,
        done,
      }) {
        yield priority(-1);
        yield done();
      }),
    };
    const memory = {
      tasks: [{
        action: 'sleeps',
      }, {
        action: 'run',
      }],
    };
    runTasks({ memory }, tasks);
    runTasks({ memory }, tasks);
    expect(tasks.sleeps).toHaveBeenCalledTimes(2);
    expect(tasks.run).toHaveBeenCalledTimes(2);
  });

  it('can sleep for awhile', () => {
    const tasks = {
      sleeps: jest.fn(function* (target, {
        sleep,
      }) {
        yield sleep(1);
        throw new Error('should not end up here');
      }),
      run: jest.fn(function* (target, {
        priority,
        done,
      }) {
        yield priority(-1);
        yield done();
      }),
    };
    const memory = {
      tasks: [{
        action: 'sleeps',
      }, {
        action: 'run',
      }],
    };
    runTasks({ memory }, tasks);
    runTasks({ memory }, tasks);
    runTasks({ memory }, tasks);
    expect(tasks.sleeps).toHaveBeenCalledTimes(2);
    expect(tasks.run).toHaveBeenCalledTimes(3);
  });
});
