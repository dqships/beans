import { useEffect, useState } from "react";
import { cancelRender, Composition, continueRender, delayRender } from "remotion";
import { FORMATS, type FormatId } from "./formats";
import { Film } from "./film/Film";
import { FPS } from "./motion";
import { DURATION } from "./timeline";

function useFigtree() {
  const [handle] = useState(() => delayRender("Loading Figtree"));
  useEffect(() => {
    Promise.all(["500 14px", "600 14px", "700 14px"].map((font) => document.fonts.load(`${font} "Figtree Variable"`)))
      .then(() => continueRender(handle))
      .catch((error) => cancelRender(error));
  }, [handle]);
}

export function Root() {
  useFigtree();
  return (
    <>
      {Object.values(FORMATS).map((format) => (
        <Composition
          key={format.id}
          id={format.composition}
          component={Film}
          durationInFrames={DURATION}
          fps={FPS}
          width={format.width}
          height={format.height}
          defaultProps={{ format: format.id as FormatId }}
        />
      ))}
    </>
  );
}
