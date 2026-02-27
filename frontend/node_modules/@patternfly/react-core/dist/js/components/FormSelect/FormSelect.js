"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormSelect = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const form_control_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/FormControl/form-control"));
const react_styles_1 = require("@patternfly/react-styles");
const constants_1 = require("../../helpers/constants");
const FormControlIcon_1 = require("../FormControl/FormControlIcon");
const helpers_1 = require("../../helpers");
const caret_down_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/caret-down-icon'));
class FormSelect extends react_1.Component {
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
            ouiaStateId: (0, helpers_1.getDefaultOUIAId)(FormSelect.displayName, props.validated)
        };
    }
    render() {
        const _a = this.props, { children, className, value, validated, isDisabled, isRequired, ouiaId, ouiaSafe } = _a, props = tslib_1.__rest(_a, ["children", "className", "value", "validated", "isDisabled", "isRequired", "ouiaId", "ouiaSafe"]);
        /* find selected option and get placeholder flag */
        const selectedOption = react_1.Children.toArray(children).find((option) => option.props.value === value);
        const isSelectedPlaceholder = selectedOption && selectedOption.props.isPlaceholder;
        const hasStatusIcon = ['success', 'error', 'warning'].includes(validated);
        return ((0, jsx_runtime_1.jsxs)("span", { className: (0, react_styles_1.css)(form_control_1.default.formControl, isDisabled && form_control_1.default.modifiers.disabled, isSelectedPlaceholder && form_control_1.default.modifiers.placeholder, hasStatusIcon && form_control_1.default.modifiers[validated], className), children: [(0, jsx_runtime_1.jsx)("select", Object.assign({}, props, { "aria-invalid": validated === constants_1.ValidatedOptions.error }, (0, helpers_1.getOUIAProps)(FormSelect.displayName, ouiaId !== undefined ? ouiaId : this.state.ouiaStateId, ouiaSafe), { onChange: this.handleChange, disabled: isDisabled, required: isRequired, value: value, children: children })), (0, jsx_runtime_1.jsxs)("span", { className: (0, react_styles_1.css)(form_control_1.default.formControlUtilities), children: [hasStatusIcon && (0, jsx_runtime_1.jsx)(FormControlIcon_1.FormControlIcon, { status: validated }), (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(form_control_1.default.formControlToggleIcon), children: (0, jsx_runtime_1.jsx)(caret_down_icon_1.default, {}) })] })] }));
    }
}
exports.FormSelect = FormSelect;
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
//# sourceMappingURL=FormSelect.js.map