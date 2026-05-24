/**
 * Built-in handler: Schema validation.
 *
 * Attaches a `validate` function to atoms via a side-channel registry.
 * If validation fails, the write is short-circuited and the rejection
 * is recorded for inspection.
 *
 * Usage:
 *   const validator = new ValidatorHandler();
 *   // Register a validator for a specific atom:
 *   validator.register(ageAtom, (v) => v >= 0 && v <= 150
 *     ? null
 *     : `Age must be 0–150, got ${v}`);
 *   const store = createStore([validator]);
 */
import type { StateHandler, Atom } from '../types';

/** Return null to accept, or a string error message to reject. */
export type ValidateFn<T> = (value: T) => string | null;

export interface ValidationError {
  atomName: string;
  value: unknown;
  error: string;
  ts: number;
}

export class ValidatorHandler implements StateHandler {
  readonly name = 'Validator';

  private registry = new Map<symbol, ValidateFn<unknown>>();

  /** Most recent validation errors, keyed by atom symbol. */
  readonly errors = new Map<symbol, ValidationError>();

  /** Callback fired whenever a write is rejected. */
  onReject?: (err: ValidationError) => void;

  /**
   * Register a validator for an atom.
   * @param atom     The atom to validate.
   * @param validate A function returning null (ok) or an error string.
   */
  register<T>(atom: Atom<T>, validate: ValidateFn<T>): void {
    this.registry.set(atom.id, validate as ValidateFn<unknown>);
  }

  write<T>(atom: Atom<T>, value: T, next: (a: Atom<T>, v: T) => void): void {
    const validate = this.registry.get(atom.id);
    if (validate) {
      const result = validate(value);
      if (result !== null) {
        const err: ValidationError = {
          atomName: atom.name,
          value,
          error: result,
          ts: Date.now(),
        };
        this.errors.set(atom.id, err);
        this.onReject?.(err);
        return; // Short-circuit — do NOT call next()
      }
      // Clear any previous error for this atom.
      this.errors.delete(atom.id);
    }
    next(atom, value);
  }
}
