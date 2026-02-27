"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextArea = exports.TextAreaReadOnlyVariant = exports.TextAreResizeOrientation = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const form_control_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/FormControl/form-control"));
const react_styles_1 = require("@patternfly/react-styles");
const helpers_1 = require("../../helpers");
const FormControlIcon_1 = require("../FormControl/FormControlIcon");
var TextAreResizeOrientation;
(function (TextAreResizeOrientation) {
    TextAreResizeOrientation["horizontal"] = "horizontal";
    TextAreResizeOrientation["vertical"] = "vertical";
    TextAreResizeOrientation["both"] = "both";
    TextAreResizeOrientation["none"] = "none";
})(TextAreResizeOrientation || (exports.TextAreResizeOrientation = TextAreResizeOrientation = {}));
var TextAreaReadOnlyVariant;
(function (TextAreaReadOnlyVariant) {
    TextAreaReadOnlyVariant["default"] = "default";
    TextAreaReadOnlyVariant["plain"] = "plain";
})(TextAreaReadOnlyVariant || (exports.TextAreaReadOnlyVariant = TextAreaReadOnlyVariant = {}));
class TextAreaBase extends react_1.Component {
    constructor(props) {
        super(props);
        this.inputRef = (0, react_1.createRef)();
        this.setAutoHeight = (field) => {
            const parent = field.parentElement;
            parent.style.setProperty('height', 'inherit');
            const computed = window.getComputedStyle(field);
            const parentComputed = window.getComputedStyle(parent);
            // Calculate the height
            const height = parseInt(computed.getPropertyValue('border-top-width')) +
                field.scrollHeight +
                parseInt(computed.getPropertyValue('border-bottom-width')) +
                parseInt(parentComputed.getPropertyValue('padding-top')) +
                parseInt(parentComputed.getPropertyValue('padding-bottom'));
            parent.style.setProperty('height', `${height}px`);
        };
        this.handleChange = (event) => {
            // https://gomakethings.com/automatically-expand-a-textarea-as-the-user-types-using-vanilla-javascript/
            const field = event.currentTarget;
            if (this.props.autoResize && helpers_1.canUseDOM) {
                this.setAutoHeight(field);
            }
            if (this.props.onChange) {
                this.props.onChange(event, field.value);
            }
        };
        if (!props.id && !props['aria-label']) {
            // eslint-disable-next-line no-console
            console.error('TextArea: TextArea requires either an id or aria-label to be specified');
        }
    }
    componentDidMount() {
        const inputRef = this.props.innerRef || this.inputRef;
        if (this.props.autoResize && helpers_1.canUseDOM) {
            const field = inputRef.current;
            this.setAutoHeight(field);
        }
    }
    render() {
        const _a = this.props, { className, value, validated, isRequired, isDisabled, readOnlyVariant, resizeOrientation, innerRef, disabled, 
        /* eslint-disable @typescript-eslint/no-unused-vars */
        autoResize, onChange, 
        /* eslint-enable @typescript-eslint/no-unused-vars */
        onBlur, onFocus } = _a, props = tslib_1.__rest(_a, ["className", "value", "validated", "isRequired", "isDisabled", "readOnlyVariant", "resizeOrientation", "innerRef", "disabled", "autoResize", "onChange", "onBlur", "onFocus"]);
        const orientation = resizeOrientation !== 'none'
            ? `resize${(0, helpers_1.capitalize)(resizeOrientation)}`
            : undefined;
        const hasStatusIcon = ['success', 'error', 'warning'].includes(validated);
        return ((0, jsx_runtime_1.jsxs)("span", { className: (0, react_styles_1.css)(form_control_1.default.formControl, form_control_1.default.modifiers.textarea, readOnlyVariant && form_control_1.default.modifiers.readonly, readOnlyVariant === 'plain' && form_control_1.default.modifiers.plain, resizeOrientation !== 'none' && form_control_1.default.modifiers[orientation], isDisabled && form_control_1.default.modifiers.disabled, hasStatusIcon && form_control_1.default.modifiers[validated], className), children: [(0, jsx_runtime_1.jsx)("textarea", Object.assign({ onChange: this.handleChange, onFocus: onFocus, onBlur: onBlur }, (typeof this.props.defaultValue !== 'string' && { value }), { "aria-invalid": validated === helpers_1.ValidatedOptions.error, required: isRequired, disabled: isDisabled || disabled, readOnly: !!readOnlyVariant, ref: innerRef || this.inputRef }, props)), hasStatusIcon && ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(form_control_1.default.formControlUtilities), children: (0, jsx_runtime_1.jsx)(FormControlIcon_1.FormControlIcon, { status: validated }) }))] }));
    }
}
TextAreaBase.displayName = 'TextArea';
TextAreaBase.defaultProps = {
    innerRef: (0, react_1.createRef)(),
    className: '',
    isRequired: false,
    isDisabled: false,
    validated: 'default',
    resizeOrientation: 'both',
    'aria-label': null
};
exports.TextArea = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(TextAreaBase, Object.assign({}, props, { innerRef: ref }))));
exports.TextArea.displayName = 'TextArea';
//# sourceMappingURL=TextArea.js.map