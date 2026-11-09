import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewClPairDialog from "../NewClPairDialog";
import { ERG_TOKEN_ID } from "@components/cl/clMath";

process.env.CRUX_API = "https://api.test.com";

const SIGUSD = "03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04";
const OTHER = "a".repeat(64);

type Handler = (url: string) => { ok: boolean; status?: number; body?: unknown };
let handler: Handler;

beforeEach(() => {
  handler = () => ({ ok: false, status: 404 });
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const r = handler(String(input));
    return {
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 404),
      json: async () => r.body,
    } as Response;
  }) as jest.Mock;
});

const searchRow = (id: string, name: string, decimals: number) => ({
  token_id: id,
  token_name: name,
  token_decimals: decimals,
});

const setup = () => {
  const onContinue = jest.fn();
  render(<NewClPairDialog open onClose={jest.fn()} onContinue={onContinue} />);
  const user = userEvent.setup();
  return {
    user,
    onContinue,
    first: screen.getByLabelText("First token"),
    second: screen.getByLabelText("Second token"),
    cont: screen.getByRole("button", { name: "Continue" }),
  };
};

describe("NewClPairDialog", () => {
  it("shows a token once when search returns one row per pool", async () => {
    handler = (url) =>
      url.includes("/crux/search_tokens")
        ? {
            ok: true,
            body: [
              searchRow(SIGUSD, "SigUSD", 2),
              searchRow(SIGUSD, "SigUSD", 2),
              searchRow(OTHER, "SigUSDX", 4),
            ],
          }
        : { ok: false };
    const { user, first } = setup();
    await user.type(first, "sig");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
    expect(screen.getAllByText("SigUSD")).toHaveLength(1);
  });

  it("puts ERG first when typing erg", async () => {
    handler = (url) =>
      url.includes("/crux/search_tokens")
        ? { ok: true, body: [searchRow(OTHER, "Ergopad", 2)] }
        : { ok: false };
    const { user, first } = setup();
    await user.type(first, "erg");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
    const opts = screen.getAllByRole("option");
    expect(opts[0]).toHaveTextContent("ERG");
    expect(opts[1]).toHaveTextContent("Ergopad");
  });

  it("resolves a pasted id and shows name and decimals", async () => {
    handler = (url) =>
      url.endsWith(`/crux/token_info/${SIGUSD}`)
        ? { ok: true, body: { token_name: "SigUSD", decimals: 2 } }
        : { ok: false };
    const { user, first } = setup();
    await user.click(first);
    await user.paste(SIGUSD);
    expect(await screen.findByText("SigUSD · 2 decimals")).toBeInTheDocument();
  });

  it("shows Token not found when token_info 404s", async () => {
    const { user, first, cont } = setup();
    await user.click(first);
    await user.paste(SIGUSD);
    expect(await screen.findByText("Token not found")).toBeInTheDocument();
    expect(cont).toBeDisabled();
  });

  it("shows Token not found when token_info has no token_name", async () => {
    handler = (url) =>
      url.includes("/crux/token_info/") ? { ok: true, body: { decimals: 2 } } : { ok: false };
    const { user, first, cont } = setup();
    await user.click(first);
    await user.paste(OTHER);
    expect(await screen.findByText("Token not found")).toBeInTheDocument();
    expect(cont).toBeDisabled();
  });

  it("warns and disables Continue when both pickers hold the same token", async () => {
    handler = (url) =>
      url.includes("/crux/token_info/")
        ? { ok: true, body: { token_name: "SigUSD", decimals: 2 } }
        : { ok: false };
    const { user, first, second, cont } = setup();
    await user.click(first);
    await user.paste(SIGUSD);
    await user.click(second);
    await user.paste(SIGUSD);
    expect(await screen.findByText("Pick two different tokens.")).toBeInTheDocument();
    expect(cont).toBeDisabled();
  });

  it("enables Continue for two different tokens and reports both", async () => {
    handler = (url) => {
      if (url.endsWith(`/crux/token_info/${SIGUSD}`))
        return { ok: true, body: { token_name: "SigUSD", decimals: 2 } };
      if (url.endsWith(`/crux/token_info/${OTHER}`))
        return { ok: true, body: { token_name: "Other", decimals: 6 } };
      return { ok: false };
    };
    const { user, first, second, cont, onContinue } = setup();
    await user.click(first);
    await user.paste(SIGUSD);
    await user.click(second);
    await user.paste(OTHER);
    await waitFor(() => expect(cont).toBeEnabled());
    await user.click(cont);
    expect(onContinue).toHaveBeenCalledWith(
      { id: SIGUSD, name: "SigUSD", decimals: 2 },
      { id: OTHER, name: "Other", decimals: 6 },
    );
  });

  it("accepts the ERG token id without a lookup", async () => {
    const { user, first } = setup();
    await user.click(first);
    await user.paste(ERG_TOKEN_ID);
    expect(await screen.findByText("ERG · 9 decimals")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
