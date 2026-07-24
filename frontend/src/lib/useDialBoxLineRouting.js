import { useCallback } from "react";

export function useDialBoxLineRouting({
  currentLine,
  currentEgg,
  personas,
  setModeSafe,
  setPersonas,
  setProgram,
  push,
  speak,
  deliver,
  backToMenu,
  loadFortunePersonas,
  enterMindline,
  enterMagic8,
  enterKnockKnock,
  enterAdventure,
  enterTrivia,
  startRuby,
  startCyndi,
  startZelda,
  startNyx,
  startCount,
  startSphinx,
  generateFortune,
  relabelPersonas,
  buildOraclePrompt,
  operatorVoice,
  oracleVoice,
}) {
  const enterLine = useCallback((slug) => {
    if (slug === "fortune") {
      setModeSafe("fortune_persona");
      loadFortunePersonas();
    } else if (slug === "therapy") {
      enterMindline();
    } else if (slug === "magic8") {
      enterMagic8();
    } else if (slug === "knockknock") {
      enterKnockKnock();
    } else if (slug === "adventure") {
      enterAdventure();
    } else if (slug === "trivia") {
      enterTrivia();
    } else {
      backToMenu();
    }
  }, [
    backToMenu,
    enterAdventure,
    enterKnockKnock,
    enterMagic8,
    enterMindline,
    enterTrivia,
    loadFortunePersonas,
    setModeSafe,
  ]);

  const routeOracleSelection = useCallback((digits) => {
    const index = parseInt(digits, 10) - 1;
    const persona = personas[index];
    if (!persona) {
      push("error", "// no such voice on this line");
      return;
    }

    push("caller", `dialed ${digits} — ${persona.name}`);
    if (persona.slug === "ruby") startRuby();
    else if (persona.slug === "cyndi") startCyndi();
    else if (persona.slug === "zelda") startZelda();
    else if (persona.slug === "nyx") startNyx();
    else if (persona.slug === "count") startCount();
    else if (persona.slug === "sphinx") startSphinx();
    else generateFortune(persona.slug);
  }, [
    generateFortune,
    personas,
    push,
    startCount,
    startCyndi,
    startNyx,
    startRuby,
    startSphinx,
    startZelda,
  ]);

  const routeProgramInteraction = useCallback((response) => {
    if (response.interaction === "mindline") {
      push("program", `Connecting to ${response.name}...`);
      enterMindline();
      return true;
    }
    if (response.interaction === "magic8") {
      push("program", `Connecting to ${response.name}...`);
      enterMagic8();
      return true;
    }
    if (response.interaction === "knockknock") {
      push("program", `Connecting to ${response.name}...`);
      enterKnockKnock();
      return true;
    }
    if (response.interaction === "adventure") {
      push("program", `Connecting to ${response.name}...`);
      enterAdventure();
      return true;
    }
    if (response.interaction === "trivia") {
      push("program", `Connecting to ${response.name}...`);
      enterTrivia();
      return true;
    }
    return false;
  }, [enterAdventure, enterKnockKnock, enterMagic8, enterMindline, enterTrivia, push]);

  const routeDialResponse = useCallback((response) => {
    if (response.type === "program" && routeProgramInteraction(response)) return;

    if (response.type === "program" && response.has_personas) {
      currentLine.current = "fortune";
      setModeSafe("fortune_persona");
      const labeled = relabelPersonas(response.personas || []);
      setPersonas(labeled);
      setProgram(response);
      push("program", `Connecting to ${response.name}...`);
      push("system", "── CHOOSE YOUR ORACLE ──");
      labeled.forEach((persona, index) => push("line", `  ${index + 1}  ${persona.name} — ${persona.blurb}`));
      push("system", "Dial 1-9 to choose, or 0 to return to the main menu. (Optionally whisper a question below first.)");
      speak(buildOraclePrompt(labeled), { voice: oracleVoice });
      return;
    }

    if (response.type === "secret") {
      setModeSafe("secret");
      currentEgg.current = response;
      push("program", `☎ ${response.title}`);
      push("program", response.response_text);
      if (response.clue) push("system", `※ clue: ${response.clue}`);
      const hasBranches = response.branches && Object.keys(response.branches).length > 0;
      push(
        "system",
        (hasBranches ? "Dial a listed option · " : "") +
          "press ✱ to hear it again · 0 for the main menu · or hang up."
      );
      const spoken = response.response_text + (response.clue ? ` ${response.clue}` : "");
      const optionsPrompt = hasBranches
        ? "Dial one of the options you heard. To hear that again, press star. To return to the main menu, dial 0. Or hang up."
        : undefined;
      deliver(spoken, { voice: response.voice }, optionsPrompt);
      return;
    }

    if (response.type === "voicemail" || response.type === "coming_soon") {
      setModeSafe("message");
      push("program", response.message);
      push("system", "To hear that again, press ✱. Dial 0 for the main menu, or hang up.");
      deliver(response.message, { voice: operatorVoice });
      return;
    }

    setModeSafe("message");
    push("error", response.message || "// not in service");
    push("system", "To hear that again, press ✱. Dial 0 for the main menu, or hang up.");
    deliver(response.message || "We're sorry. The number you have dialed is not in service.", { voice: operatorVoice });
  }, [
    buildOraclePrompt,
    currentEgg,
    currentLine,
    deliver,
    operatorVoice,
    oracleVoice,
    push,
    relabelPersonas,
    routeProgramInteraction,
    setModeSafe,
    setPersonas,
    setProgram,
    speak,
  ]);

  const routeScheduledInteraction = useCallback((schedule) => {
    if (schedule && schedule.interaction === "mindline") {
      enterMindline();
    } else if (schedule && schedule.interaction === "knockknock") {
      enterKnockKnock();
    } else if (schedule && schedule.interaction === "magic8") {
      enterMagic8();
    } else {
      setModeSafe("fortune_persona");
      loadFortunePersonas();
    }
  }, [enterKnockKnock, enterMagic8, enterMindline, loadFortunePersonas, setModeSafe]);

  return {
    enterLine,
    routeOracleSelection,
    routeDialResponse,
    routeScheduledInteraction,
  };
}
