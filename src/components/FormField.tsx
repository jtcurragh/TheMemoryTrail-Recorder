interface FormFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  error?: string
  type?: 'text' | 'email' | 'password'
}

export function FormField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  type = 'text',
}: FormFieldProps) {
  return (
    <div className="mb-6">
      <label
        htmlFor={id}
        className="block text-lg font-bold text-govuk-text mb-2"
      >
        {label}
        {required && <span className="text-govuk-red"> *</span>}
      </label>
      {error && (
        <p
          id={`${id}-error`}
          className="text-govuk-red font-bold mb-2"
          role="alert"
        >
          {error}
        </p>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className="block w-full min-h-[48px] px-4 py-3 text-lg border-2 border-govuk-border rounded-none"
      />
    </div>
  )
}
