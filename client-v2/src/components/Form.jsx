import React, { useState } from "react";

const Form = ({
  fields,
  initialValues = {},
  onSubmit,
  buttonText = "Submit",
}) => {
  const [values, setValues] = useState(initialValues);

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name}>
          <label className="block mb-1 font-medium" htmlFor={field.name}>
            {field.label}
          </label>
          {field.type === "textarea" ? (
            <textarea
              name={field.name}
              id={field.name}
              value={values[field.name] || ""}
              onChange={handleChange}
              className="border rounded px-3 py-2 w-full"
              required={field.required}
              placeholder={field.placeholder}
              rows={4}
            />
          ) : (
            <input
              type={field.type || "text"}
              name={field.name}
              id={field.name}
              value={values[field.name] || ""}
              onChange={handleChange}
              className="border rounded px-3 py-2 w-full"
              required={field.required}
              placeholder={field.placeholder}
            />
          )}
        </div>
      ))}
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {buttonText}
      </button>
    </form>
  );
};

export default Form;
