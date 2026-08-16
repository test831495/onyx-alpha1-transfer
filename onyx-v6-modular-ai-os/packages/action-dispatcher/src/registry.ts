import type {
  ActionResult,
  Intent,
} from "@onyx/contracts";

export interface ActionContext {
  requestId: string;
  signal: AbortSignal;
}

export type ActionHandler<
  TIntent extends Intent = Intent,
> = (
  intent: TIntent,
  context: ActionContext,
) => Promise<ActionResult>;

export class ActionHandlerRegistry {
  private readonly handlers =
    new Map<
      Intent["kind"],
      ActionHandler
    >();

  register<
    TKind extends Intent["kind"],
  >(
    kind: TKind,
    handler: ActionHandler<
      Extract<
        Intent,
        {
          kind: TKind;
        }
      >
    >,
  ): void {
    if (this.handlers.has(kind)) {
      throw new Error(
        `Handler already registered: ${kind}`,
      );
    }

    this.handlers.set(
      kind,
      handler as ActionHandler,
    );
  }

  get(
    kind: Intent["kind"],
  ): ActionHandler | undefined {
    return this.handlers.get(kind);
  }
}