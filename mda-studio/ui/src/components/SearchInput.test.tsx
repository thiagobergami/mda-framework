import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchInput } from "./SearchInput";

describe("SearchInput", () => {
  it("renders the current value", () => {
    render(<SearchInput value="hello" onChange={() => {}} />);
    expect(screen.getByLabelText("Search specs")).toHaveValue("hello");
  });

  it("debounces typed text before calling onChange", async () => {
    const onChange = vi.fn();
    render(
      <SearchInput value="" onChange={onChange} debounceMs={50} />,
    );
    const input = screen.getByLabelText("Search specs");
    await userEvent.setup().type(input, "rev");
    // Wait past the debounce window.
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("rev"));
  });

  it("commits immediately on Enter", async () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} debounceMs={500} />);
    const input = screen.getByLabelText("Search specs");
    const user = userEvent.setup();
    await user.type(input, "fast");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("fast");
  });

  it("Escape clears the input and blurs", async () => {
    const onChange = vi.fn();
    render(<SearchInput value="hello" onChange={onChange} />);
    const input = screen.getByLabelText("Search specs") as HTMLInputElement;
    input.focus();
    await userEvent.setup().keyboard("{Escape}");
    expect(onChange).toHaveBeenCalledWith("");
    expect(input).not.toHaveFocus();
  });

  it("syncs to external value changes (URL changed via chip removal)", async () => {
    const { rerender } = render(
      <SearchInput value="one" onChange={() => {}} />,
    );
    rerender(<SearchInput value="two" onChange={() => {}} />);
    expect(screen.getByLabelText("Search specs")).toHaveValue("two");
  });
});
