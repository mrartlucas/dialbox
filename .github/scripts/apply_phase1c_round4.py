from pathlib import Path

PHONE = Path("frontend/src/components/PhoneSimulator.jsx")
phone = PHONE.read_text()

# Add routing-hook import.
keypad_import = 'import { useDialBoxKeypadControls } from "../lib/useDialBoxKeypadControls";\n'
routing_import = 'import { useDialBoxLineRouting } from "../lib/useDialBoxLineRouting";\n'
if routing_import not in phone:
    if keypad_import not in phone:
        raise SystemExit("Expected keypad hook import was not found")
    phone = phone.replace(keypad_import, keypad_import + routing_import, 1)

# Add a live callback ref so routing can be declared before generateFortune.
current_egg = '  const currentEgg = useRef(null);\n'
fortune_ref = '  const generateFortuneRef = useRef(null);\n'
if fortune_ref not in phone:
    if current_egg not in phone:
        raise SystemExit("Expected currentEgg ref was not found")
    phone = phone.replace(current_egg, current_egg + fortune_ref, 1)

# Replace local enterLine with the extracted routing hook.
enter_start = '  const enterLine = useCallback((slug) => {\n'
enter_end = '  const triggerExitConfirm = useCallback(() => {\n'
if enter_start in phone:
    start = phone.index(enter_start)
    end = phone.index(enter_end, start)
    hook_setup = '''  const {
    enterLine,
    routeOracleSelection,
    routeDialResponse,
    routeScheduledInteraction,
  } = useDialBoxLineRouting({
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
    generateFortuneRef,
    relabelPersonas: relabelForToday,
    buildOraclePrompt: oraclePrompt,
    operatorVoice: OPERATOR_VOICE,
    oracleVoice: ORACLE_VOICE,
  });

'''
    phone = phone[:start] + hook_setup + phone[end:]
elif 'routeScheduledInteraction,' not in phone:
    raise SystemExit("Expected enterLine block was not found")

# Keep the live fortune callback current after its declaration.
process_marker = '  const processDial = useCallback(async (digits) => {\n'
fortune_assignment = '  generateFortuneRef.current = generateFortune;\n\n'
if fortune_assignment not in phone:
    if process_marker not in phone:
        raise SystemExit("Expected processDial marker was not found")
    phone = phone.replace(process_marker, fortune_assignment + process_marker, 1)

# Delegate oracle selection to the routing hook.
mode_start = '    if (curMode === "fortune_persona") {\n'
mode_end = '    setModeSafe("busy");\n'
if mode_start in phone:
    start = phone.index(mode_start, phone.index(process_marker))
    end = phone.index(mode_end, start)
    phone = phone[:start] + '''    if (curMode === "fortune_persona") {
      routeOracleSelection(digits);
      return;
    }

''' + phone[end:]
elif 'routeOracleSelection(digits);' not in phone:
    raise SystemExit("Expected oracle-selection block was not found")

# Delegate dial-response interpretation to the routing hook.
response_start = '      if (res.type === "program" && res.interaction === "mindline") {\n'
response_end = '    } catch (e) {\n'
if response_start in phone:
    start = phone.index(response_start, phone.index(process_marker))
    end = phone.index(response_end, start)
    phone = phone[:start] + '      routeDialResponse(res);\n' + phone[end:]
elif 'routeDialResponse(res);' not in phone:
    raise SystemExit("Expected dial-response routing block was not found")

# Delegate scheduled-call destination choice to the routing hook.
sched_start = '      if (sched && sched.interaction === "mindline") {\n'
sched_end = '      return;\n'
if sched_start in phone:
    start = phone.index(sched_start, phone.index('  const lift = useCallback(() => {\n'))
    end = phone.index(sched_end, start)
    phone = phone[:start] + '      routeScheduledInteraction(sched);\n' + phone[end:]
elif 'routeScheduledInteraction(sched);' not in phone:
    raise SystemExit("Expected scheduled routing block was not found")

PHONE.write_text(phone)
print("Applied Phase 1C round-four Line routing extraction.")
