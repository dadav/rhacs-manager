import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Spinner/spinner.mjs';
import { css } from '@patternfly/react-styles';
import cssDiameter from '@patternfly/react-tokens/dist/esm/c_spinner_diameter';
export var spinnerSize;
(function (spinnerSize) {
    spinnerSize["sm"] = "sm";
    spinnerSize["md"] = "md";
    spinnerSize["lg"] = "lg";
    spinnerSize["xl"] = "xl";
})(spinnerSize || (spinnerSize = {}));
export const Spinner = (_a) => {
    var { className = '', size = 'xl', 'aria-valuetext': ariaValueText = 'Loading...', diameter, isInline = false, 'aria-label': ariaLabel, 'aria-labelledBy': ariaLabelledBy } = _a, props = __rest(_a, ["className", "size", 'aria-valuetext', "diameter", "isInline", 'aria-label', 'aria-labelledBy']);
    return (_jsx("svg", Object.assign({ className: css(styles.spinner, isInline ? styles.modifiers.inline : styles.modifiers[size], className), role: "progressbar", "aria-valuetext": ariaValueText, viewBox: "0 0 100 100" }, (diameter && { style: { [cssDiameter.name]: diameter } }), (ariaLabel && { 'aria-label': ariaLabel }), (ariaLabelledBy && { 'aria-labelledBy': ariaLabelledBy }), (!ariaLabel && !ariaLabelledBy && { 'aria-label': 'Contents' }), props, { children: _jsx("circle", { className: styles.spinnerPath, cx: "50", cy: "50", r: "45", fill: "none" }) })));
};
Spinner.displayName = 'Spinner';
//# sourceMappingURL=Spinner.js.map