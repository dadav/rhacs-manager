import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState } from 'react';
const FormContext = createContext({});
export const FormContextConsumer = FormContext.Consumer;
export const FormContextProvider = ({ initialValues, children }) => {
    var _a;
    const [values, setValues] = useState(initialValues || {});
    const [errors, setErrors] = useState({});
    const [validators, setValidators] = useState({});
    const [touched, setTouched] = useState({});
    const isValid = ((_a = Object.keys(errors)) === null || _a === void 0 ? void 0 : _a.length) === 0;
    const getValue = (fieldId) => Object.entries(values).reduce((acc, [id, value]) => (id === fieldId ? value : acc), '');
    const setValue = (fieldId, value, triggerValidation = true) => {
        var _a;
        if (values[fieldId] !== value) {
            setValues((prevValues) => (Object.assign(Object.assign({}, prevValues), { [fieldId]: value })));
            triggerValidation && ((_a = validators[fieldId]) === null || _a === void 0 ? void 0 : _a.call(validators, value));
        }
    };
    const getError = (fieldId) => Object.entries(errors).reduce((acc, [id, error]) => (id === fieldId ? error : acc), '');
    const setError = (fieldId, error) => errors[fieldId] !== error &&
        setErrors((_a) => {
            var _b = fieldId, _ = _a[_b], prevErrors = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
            return (Object.assign(Object.assign({}, prevErrors), (!!error && { [fieldId]: error })));
        });
    const isTouched = (fieldId) => Object.entries(touched).reduce((acc, [id, isTouched]) => (id === fieldId ? isTouched : acc), false);
    const setFieldTouched = (fieldId, isTouched) => touched[fieldId] !== isTouched &&
        setTouched((_a) => {
            var _b = fieldId, _ = _a[_b], prevTouched = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
            return (Object.assign(Object.assign({}, prevTouched), (isTouched && { [fieldId]: isTouched })));
        });
    const setValidator = (fieldId, validate) => validators[fieldId] !== validate && setValidators((prevValidators) => (Object.assign(Object.assign({}, prevValidators), { [fieldId]: validate })));
    // Accumulate and return errors from all fields with validators.
    const validate = () => {
        var _a;
        return (_a = Object.entries(validators)) === null || _a === void 0 ? void 0 : _a.reduce((acc, [id, validateField]) => {
            const fieldError = validateField(values[id]);
            if (fieldError) {
                acc[id] = fieldError;
            }
            return acc;
        }, {});
    };
    return (_jsx(FormContext.Provider, { value: {
            values,
            errors,
            touched,
            isValid,
            setValues,
            setErrors,
            getValue,
            setValue,
            getError,
            setError,
            validate,
            setValidator,
            isTouched,
            setTouched: setFieldTouched
        }, children: typeof children === 'function' ? (_jsx(FormContext.Consumer, { children: (formContext) => children(formContext) })) : (children) }));
};
FormContextProvider.displayName = 'FormContextProvider';
export const useFormContext = () => useContext(FormContext);
//# sourceMappingURL=FormContext.js.map