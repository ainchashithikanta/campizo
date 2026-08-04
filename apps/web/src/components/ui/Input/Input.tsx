import React, { forwardRef } from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, iconLeft, iconRight, id, className = '', ...props },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputContainer}>
        {iconLeft && <div className={styles.iconLeft}>{iconLeft}</div>}
        <input
          ref={ref}
          id={inputId}
          className={[
            styles.input,
            error ? styles.inputError : '',
            iconLeft ? styles.hasIconLeft : '',
            iconRight ? styles.hasIconRight : '',
            className
          ]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={Boolean(error)}
          aria-describedby={error && inputId ? `${inputId}-error` : undefined}
          {...props}
        />
        {iconRight && <div className={styles.iconRight}>{iconRight}</div>}
      </div>
      {error && (
        <span id={inputId ? `${inputId}-error` : undefined} className={styles.errorText} role="alert">
          {error}
        </span>
      )}
    </div>
  );
});
