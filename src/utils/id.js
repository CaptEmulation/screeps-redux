function randomNum(length) {
  return Math.floor(Math.random() * Math.floor(length));
}

export const happy = (function () {
  const happyParts = {
    emoji: [
      '💵','💶','💷','💳','💲','🤑','💸','💰','💴','💹','⚡',
    ],
    left: [
      '└(','(✿','ヽ༼ຈ','(づ','~(','(.','ヘ(',
    ],
    middle: [
       '・_・',
       '^o^',
      '◠‿◠',
      '◕‿◕',
      '◕‿‿◕',
      '˘▾˘',
      '^o^',
      '^_^',
      '❛ᴗ❛',
      '^‿^',
      'ᵔ ͜ʖ ͡ᵔ',
    ],
    right: [
      ')┘','✿)','｡)',')づ','˘~)','.)','ຈ༽ﾉ',
    ],
    continue: [
      ')人(',')Ｘ(',')ノ＼(',
    ]
  }

  happyParts.continueRight = [...happyParts.continue, ...happyParts.right];

  const START = 0;
  const LEFT = 1;
  const LEFT_LENGTH = happyParts.left.length;
  const MIDDLE = 2;
  const MIDDLE_LENGTH = happyParts.middle.length;
  const CONTINUE = 3;
  const CONTINUE_LENGTH = happyParts.continue.length;
  const RIGHT = 4;
  const RIGHT_LENGTH = happyParts.right.length;
  const CONTINUE_RIGHT_LENGTH = RIGHT_LENGTH + CONTINUE_LENGTH;
  const EMOJI_LENGTH = happyParts.emoji.length;

  function* generateEmoji(length) {
    for(let i = 0; i < length; i++) {
      yield happyParts.emoji[randomNum(EMOJI_LENGTH)];
    }
  }

  function* generateText(length) {
    let lastPart = START;
    for (let i = 0; i < length; i++) {
      if (lastPart === START || lastPart === RIGHT) {
        lastPart = LEFT;
        yield happyParts.left[randomNum(LEFT_LENGTH)];
      } else if (lastPart === LEFT || lastPart === CONTINUE) {
        lastPart = MIDDLE;
        yield happyParts.middle[randomNum(MIDDLE_LENGTH)];
      } else if (lastPart === MIDDLE) {
        const num = randomNum(CONTINUE_RIGHT_LENGTH);
        if (num < CONTINUE_LENGTH) {
          lastPart = CONTINUE;
        } else {
          lastPart = RIGHT;
        }
        yield happyParts.continueRight[num];
      }
    }
    if (lastPart === MIDDLE) {
      yield happyParts.right[randomNum(RIGHT_LENGTH)];
    } else if (lastPart === CONTINUE || lastPart === LEFT) {
      yield happyParts.middle[randomNum(MIDDLE_LENGTH)];
      yield happyParts.right[randomNum(RIGHT_LENGTH)];
    }
  }

  return function happy(length = 5) {
    let id;
    do {
      id = [...generateText(length)].join('');
    } while (Game.creeps[id])
    return id;
  }
})();

global.happy = happy;
