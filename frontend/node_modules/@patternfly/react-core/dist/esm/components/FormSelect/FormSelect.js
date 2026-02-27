import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Children, Component } from 'react';
import styles from '@patternfly/react-styles/css/components/FormControl/form-control.mjs';
import { css } from '@patternfly/react-styles';
import { ValidatedOptions } from '../../helpers/constants';
import { FormControlIcon } from '../FormControl/FormControlIcon';
import { getOUIAProps, getDefaultOUIAId } from '../../helpers';
import CaretDownIcon from '@patternfly/react-icons/dist/esm/icons/caret-down-icon';
class FormSelect extends Component {
    constructor(props) {
        super(props);
        this.handleChange = (event) => {
            this.props.onChange(event, event.currentTarget.value);
        };
        if (!props.id && !props['aria-label']) {
            // eslint-disable-next-line no-console
            console.error('FormSelect requires either an id or aria-label to be specified');
        }
        this.state = {
            ouiaStateId: getDefaultOUIAId(FormSelect.displayName, props.validated)
        };
    }
    render() {
        const _a = this.props, { children, className, value, validated, isDisabled, isRequired, ouiaId, ouiaSafe } = _a, props = __rest(_a, ["children", "className", "value", "validated", "isDisabled", "isRequired", "ouiaId", "ouiaSafe"]);
        /* find selected option and get placeholder flag */
        const selectedOption = Children.toArray(children).find((option) => option.props.value === value);
        const isSelectedPlaceholder = selectedOption && selectedOption.props.isPlaceholder;
        const hasStatusIcon = ['success', 'error', 'warning'].includes(validated);
        return (_jsxs("span", { className: css(styles.formControl, isDisabled && styles.modifiers.disabled, isSelectedPlaceholder && styles.modifiers.placeholder, hasStatusIcon && styles.modifiers[validated], className), children: [_jsx("select", Object.assign({}, props, { "aria-invalid": validated === ValidatedOptions.error }, getOUIAProps(FormSelect.displayName, ouiaId !== undefined ? ouiaId : this.state.ouiaStateId, ouiaSafe), { onChange: this.handleChange, disabled: isDisabled, required: isRequired, value: value, children: children })), _jsxs("span", { className: css(styles.formControlUtilities), children: [hasStatusIcon && _jsx(FormControlIcon, { status: validated }), _jsx("span", { className: css(styles.formControlToggleIcon), children: _jsx(CaretDownIcon, {}) })] })] }));
    }
}
FormSelect.displayName = 'FormSelect';
FormSelect.defaultProps = {
    className: '',
    value: '',
    validated: 'default',
    isDisabled: false,
    isRequired: false,
    onBlur: () => undefined,
    onFocus: () => undefined,
    onChange: () => undefined,
    ouiaSafe: true
};
export { FormSelect };
//# sourceMappingURL=FormSelect.js.map