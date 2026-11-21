// @vitest-environment jsdom
import { afterEach, describe, it, expect } from "vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "@/components/ui";

/** A typical form-in-a-modal: the parent re-renders on every keystroke and passes a NEW onClose each time. */
function Demo() {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add">
        <label>Company<input aria-label="company" value={a} onChange={(e) => setA(e.target.value)} /></label>
        <label>Role<input aria-label="role" value={b} onChange={(e) => setB(e.target.value)} /></label>
      </Modal>
    </div>
  );
}

afterEach(cleanup);

describe("typing inside a modal form", () => {
  it("keeps focus while typing several letters in a row", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByText("Open"));
    const company = screen.getByLabelText("company") as HTMLInputElement;
    await user.click(company);
    await user.keyboard("Acme");           // must NOT need a click between letters
    expect(company.value).toBe("Acme");
    expect(document.activeElement).toBe(company);
  });
  it("typing in the second field does not jump back to the first", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByText("Open"));
    const role = screen.getByLabelText("role") as HTMLInputElement;
    await user.click(role);
    await user.keyboard("Dev");
    expect(role.value).toBe("Dev");
    expect(document.activeElement).toBe(role);
  });
  it("Escape closes the dialog and focus returns to the opener", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const opener = screen.getByText("Open");
    await user.click(opener);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
