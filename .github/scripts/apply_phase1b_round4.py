from pathlib import Path

PHONE = Path("frontend/src/components/PhoneSimulator.jsx")
TEST = Path("frontend/src/components/PhoneSimulator.test.jsx")


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"Expected block not found: {label}")
    return text.replace(old, new, 1)


phone = PHONE.read_text()

old_hash = '''    // ## (double pound) = universal exit; opens the End Call? confirmation.
    if (d === "#") {
      // In Nyx's constellation builder, # submits the constellation for a reading.
      if (modeRef.current === "nyx_build") {
        if (nyxStars.current.length >= 1) generateNyxReading(nyxStars.current.slice());
        else push("system", "Place at least one star (press 1-9), then press #.");
        return;
      }
      // In the Count's number / mathemagic entry, # submits the typed-or-keyed number.
      if (["count_number", "count_magic", "count_magic_37", "count_magic_kaprekar"].includes(modeRef.current)) {
        submitCurrent();
        return;
      }
      // In the Sphinx's riddle challenge, # submits the typed answer.
      if (modeRef.current === "sphinx_riddle") { submitCurrent(); return; }
      if (hashPending.current) {
        clearTimeout(hashPending.current);
        hashPending.current = null;
        if (inExperience) triggerExitConfirm();
        return;
      }
      hashPending.current = setTimeout(() => {
        hashPending.current = null;
        if (generation !== sessionGeneration.current) return;
        if (modeRef.current === "result") chooseAnotherOracle(); // single # = another oracle
      }, 650);
      return;
    }
'''

new_hash = '''    // ## (double pound) = universal exit; opens the End Call? confirmation.
    // Every single-pound submit waits through the same short grace period so a
    // second pound can cancel it before Nyx, Count, Sphinx, or result routing fires.
    if (d === "#") {
      if (hashPending.current) {
        clearTimeout(hashPending.current);
        hashPending.current = null;
        if (inExperience) triggerExitConfirm();
        return;
      }
      const modeAtHash = m;
      hashPending.current = setTimeout(() => {
        hashPending.current = null;
        if (generation !== sessionGeneration.current || modeRef.current !== modeAtHash) return;
        if (modeAtHash === "nyx_build") {
          if (nyxStars.current.length >= 1) generateNyxReading(nyxStars.current.slice());
          else push("system", "Place at least one star (press 1-9), then press #.");
        } else if (["count_number", "count_magic", "count_magic_37", "count_magic_kaprekar", "sphinx_riddle"].includes(modeAtHash)) {
          submitCurrent();
        } else if (modeAtHash === "result") {
          chooseAnotherOracle();
        }
      }, 650);
      return;
    }
'''

phone = replace_once(phone, old_hash, new_hash, "universal double-pound handler")
PHONE.write_text(phone)

test = TEST.read_text()

todo = '  test.todo("universal ## works in every submit mode");'
replacement = '''  test("universal ## cancels Nyx constellation submission", async () => {
    const { container } = await renderPhone();
    await lift(container);
    await press(container, "1");
    await waitDialPause();
    await waitForFortuneMenu(container);
    await press(container, "4");
    await waitDialPause();
    await waitForStatus(container, "NYX OF THE NINE STARS");
    await press(container, "1");
    await press(container, "#");
    await press(container, "#");
    expect(status(container)).toBe("END CALL?");
    expect(mockApi.nyxReading).not.toHaveBeenCalled();
  });

  test("universal ## cancels Count number submission", async () => {
    const { container } = await renderPhone();
    await lift(container);
    await press(container, "1");
    await waitDialPause();
    await waitForFortuneMenu(container);
    await press(container, "5");
    await waitDialPause();
    await waitForStatus(container, "COUNT CLAIRVOYANT");
    await press(container, "1");
    await press(container, "1");
    await press(container, "7");
    await press(container, "#");
    await press(container, "#");
    expect(status(container)).toBe("END CALL?");
    expect(mockApi.countReading).not.toHaveBeenCalled();
  });

  test("universal ## cancels Sphinx riddle submission", async () => {
    const { container } = await renderPhone();
    await lift(container);
    await press(container, "1");
    await waitDialPause();
    await waitForFortuneMenu(container);
    await press(container, "6");
    await waitDialPause();
    await waitForStatus(container, "THE SPHINX");
    await press(container, "2");
    await press(container, "#");
    await press(container, "#");
    expect(status(container)).toBe("END CALL?");
    expect(mockApi.sphinxGates).not.toHaveBeenCalled();
  });

  test("a lone pound still submits Nyx after the double-pound grace period", async () => {
    const { container } = await renderPhone();
    await lift(container);
    await press(container, "1");
    await waitDialPause();
    await waitForFortuneMenu(container);
    await press(container, "4");
    await waitDialPause();
    await waitForStatus(container, "NYX OF THE NINE STARS");
    await press(container, "1");
    await press(container, "#");
    expect(mockApi.nyxReading).not.toHaveBeenCalled();
    await waitPoundPause();
    expect(mockApi.nyxReading).toHaveBeenCalledWith([1]);
  });'''

test = replace_once(test, todo, replacement, "activate universal double-pound regressions")
TEST.write_text(test)
print("Applied Phase 1B round-four universal double-pound handling.")
