import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/NumberInput/number-input.mjs';
import { css } from '@patternfly/react-styles';
import MinusIcon from '@patternfly/react-icons/dist/esm/icons/minus-icon';
import PlusIcon from '@patternfly/react-icons/dist/esm/icons/plus-icon';
import { InputGroup, InputGroupItem } from '../InputGroup';
import { Button } from '../Button';
import { KeyTypes, ValidatedOptions } from '../../helpers';
import { TextInput } from '../TextInput';
import cssFormControlWidthChars from '@patternfly/react-tokens/dist/esm/c_number_input_c_form_control_width_chars';
const defaultKeyDownHandler = (args) => (event) => {
    if (KeyTypes.ArrowUp === event.key && args.onPlus) {
        event.preventDefault();
        args.onPlus(null, args.inputName);
    }
    if (KeyTypes.ArrowDown === event.key && args.onMinus) {
        event.preventDefault();
        args.onMinus(null, args.inputName);
    }
};
const DEFAULT_VALUE = 0;
export const NumberInput = (_a) => {
    var { value = DEFAULT_VALUE, className, widthChars, isDisabled = false, validated = ValidatedOptions.default, onMinus = () => { }, onChange, onBlur, onPlus = () => { }, unit, unitPosition = 'after', min, max, inputName, inputAriaLabel = 'Input', minusBtnAriaLabel = 'Minus', plusBtnAriaLabel = 'Plus', inputProps, minusBtnProps, plusBtnProps } = _a, props = __rest(_a, ["value", "className", "widthChars", "isDisabled", "validated", "onMinus", "onChange", "onBlur", "onPlus", "unit", "unitPosition", "min", "max", "inputName", "inputAriaLabel", "minusBtnAriaLabel", "plusBtnAriaLabel", "inputProps", "minusBtnProps", "plusBtnProps"]);
    const numberInputUnit = _jsx("div", { className: css(styles.numberInputUnit), children: unit });
    const keyDownHandler = inputProps && inputProps.onKeyDown ? inputProps.onKeyDown : defaultKeyDownHandler({ inputName, onMinus, onPlus });
    const handleBlur = (event) => {
        event.target.value = Number(event.target.value).toString();
        if (onChange) {
            onChange(event);
        }
        if (onBlur) {
            onBlur(event);
        }
    };
    return (_jsxs("div", Object.assign({ 
        // TODO: Update with issue #9978. Removed "validated !== 'default' && styles.modifiers.status" from classname to get build to work
        className: css(styles.numberInput, className) }, (widthChars && {
        style: Object.assign({ [cssFormControlWidthChars.name]: widthChars }, props.style)
    }), props, { children: [unit && unitPosition === 'before' && numberInputUnit, _jsxs(InputGroup, { children: [_jsx(InputGroupItem, { children: _jsx(Button, Object.assign({ variant: "control", "aria-label": minusBtnAriaLabel, isDisabled: isDisabled || (typeof value === 'number' ? value : DEFAULT_VALUE) <= min, onClick: (evt) => onMinus(evt, inputName), icon: _jsx("span", { className: css(styles.numberInputIcon), children: _jsx(MinusIcon, {}) }) }, minusBtnProps)) }), _jsx(InputGroupItem, { children: _jsx(TextInput, Object.assign({}, inputProps, { type: "number", value: value, name: inputName, "aria-label": inputAriaLabel }, (isDisabled && { isDisabled }), (onChange && { onChange: (event, _value) => onChange(event) }), { onBlur: handleBlur }, (!onChange && { readOnlyVariant: 'default' }), { onKeyDown: keyDownHandler, validated: validated })) }), _jsx(InputGroupItem, { children: _jsx(Button, Object.assign({ variant: "control", "aria-label": plusBtnAriaLabel, isDisabled: isDisabled || (typeof value === 'number' ? value : DEFAULT_VALUE) >= max, onClick: (evt) => onPlus(evt, inputName), icon: _jsx("span", { className: css(styles.numberInputIcon), children: _jsx(PlusIcon, {}) }) }, plusBtnProps)) })] }), unit && unitPosition === 'after' && numberInputUnit] })));
};
NumberInput.displayName = 'NumberInput';
//# sourceMappingURL=NumberInput.js.map