// Lets the About page's opening (Intro) hold back the Hero's entrance until the curtain opens. Intro calls
// `holdIntro` when it is going to play and `releaseIntro` when the Hero should start; when the intro is skipped
// it releases straight away, so `whenIntroDone` callbacks run immediately.

let held = false;
const waiting = new Set<() => void>();

export function holdIntro() {
  held = true;
}

export function releaseIntro() {
  held = false;
  waiting.forEach((run) => run());
  waiting.clear();
}

export function whenIntroDone(run: () => void) {
  if (!held) {
    run();
    return () => {};
  }
  waiting.add(run);
  return () => {
    waiting.delete(run);
  };
}
