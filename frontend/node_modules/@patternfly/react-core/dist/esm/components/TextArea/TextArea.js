import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component, createRef, forwardRef } from 'react';
import styles from '@patternfly/react-styles/css/components/FormControl/form-control.mjs';
import { css } from '@patternfly/react-styles';
import { capitalize, ValidatedOptions, canUseDOM } from '../../helpers';
import { FormControlIcon } from '../FormControl/FormControlIcon';
export var TextAreResizeOrientation;
(function (TextAreResizeOrientation) {
    TextAreResizeOrientation["horizontal"] = "horizontal";
    TextAreResizeOrientation["vertical"] = "vertical";
    TextAreResizeOrientation["both"] = "both";
    TextAreResizeOrientation["none"] = "none";
})(TextAreResizeOrientation || (TextAreResizeOrientation = {}));
export var TextAreaReadOnlyVariant;
(function (TextAreaReadOnlyVariant) {
    TextAreaReadOnlyVariant["default"] = "default";
    TextAreaReadOnlyVariant["plain"] = "plain";
})(TextAreaReadOnlyVariant || (TextAreaReadOnlyVariant = {}));
class TextAreaBase extends Component {
    constructor(props) {
        super(props);
        this.inputRef = createRef();
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
            if (this.props.autoResize && canUseDOM) {
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
        if (this.props.autoResize && canUseDOM) {
            const field = inputRef.current;
            this.setAutoHeight(field);
        }
    }
    render() {
        const _a = this.props, { className, value, validated, isRequired, isDisabled, readOnlyVariant, resizeOrientation, innerRef, disabled, 
        /* eslint-disable @typescript-eslint/no-unused-vars */
        autoResize, onChange, 
        /* eslint-enable @typescript-eslint/no-unused-vars */
        onBlur, onFocus } = _a, props = __rest(_a, ["className", "value", "validated", "isRequired", "isDisabled", "readOnlyVariant", "resizeOrientation", "innerRef", "disabled", "autoResize", "onChange", "onBlur", "onFocus"]);
        const orientation = resizeOrientation !== 'none'
            ? `resize${capitalize(resizeOrientation)}`
            : undefined;
        const hasStatusIcon = ['success', 'error', 'warning'].includes(validated);
        return (_jsxs("span", { className: css(styles.formControl, styles.modifiers.textarea, readOnlyVariant && styles.modifiers.readonly, readOnlyVariant === 'plain' && styles.modifiers.plain, resizeOrientation !== 'none' && styles.modifiers[orientation], isDisabled && styles.modifiers.disabled, hasStatusIcon && styles.modifiers[validated], className), children: [_jsx("textarea", Object.assign({ onChange: this.handleChange, onFocus: onFocus, onBlur: onBlur }, (typeof this.props.defaultValue !== 'string' && { value }), { "aria-invalid": validated === ValidatedOptions.error, required: isRequired, disabled: isDisabled || disabled, readOnly: !!readOnlyVariant, ref: innerRef || this.inputRef }, props)), hasStatusIcon && (_jsx("span", { className: css(styles.formControlUtilities), children: _jsx(FormControlIcon, { status: validated }) }))] }));
    }
}
TextAreaBase.displayName = 'TextArea';
TextAreaBase.defaultProps = {
    innerRef: createRef(),
    className: '',
    isRequired: false,
    isDisabled: false,
    validated: 'default',
    resizeOrientation: 'both',
    'aria-label': null
};
export const TextArea = forwardRef((props, ref) => (_jsx(TextAreaBase, Object.assign({}, props, { innerRef: ref }))));
TextArea.displayName = 'TextArea';
//# sourceMappingURL=TextArea.js.map