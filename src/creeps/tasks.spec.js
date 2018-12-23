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
      test: function *({ priority, done }) {
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
    const preDone1 = jest.fn();
    const postDone1 = jest.fn();
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
      test: function *({ priority, done }) {
        prePri();
        yield priority();
        preDone();
        yield done();
        postDone();
      },
      test1: function *({ priority, done }) {
        prePri1();
        yield priority();
        preDone1();
        yield done();
        postDone1();
      },
    });

    expect(prePri).toHaveBeenCalledTimes(0);
    expect(preDone).toHaveBeenCalledTimes(0);
    expect(postDone).toHaveBeenCalledTimes(0);
    expect(prePri1).toHaveBeenCalledTimes(1);
    expect(preDone1).toHaveBeenCalledTimes(1);
    expect(postDone1).toHaveBeenCalledTimes(0);
  });

  it('runs sub sub task', () => {
    const prePri = jest.fn();
    const prePri1 = jest.fn();
    const prePri2 = jest.fn();
    const preDone2 = jest.fn();
    const postDone2 = jest.fn();
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
      test: function *({ priority, done }) {
        prePri();
        yield priority();
        yield done();
      },
      test1: function *({ priority, done }) {
        prePri1();
        yield priority();
        yield done();
      },
      test2: function *({ priority, done }) {
        prePri2();
        yield priority();
        preDone2();
        yield done();
        postDone2();
      },
    });

    expect(prePri).toHaveBeenCalledTimes(0);
    expect(prePri1).toHaveBeenCalledTimes(0);
    expect(prePri2).toHaveBeenCalledTimes(1);
    expect(preDone2).toHaveBeenCalledTimes(1);
    expect(postDone2).toHaveBeenCalledTimes(0);
  });
})
