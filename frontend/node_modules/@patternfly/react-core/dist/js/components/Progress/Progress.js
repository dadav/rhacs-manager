"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Progress = exports.ProgressSize = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const progress_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Progress/progress"));
const react_styles_1 = require("@patternfly/react-styles");
const ProgressContainer_1 = require("./ProgressContainer");
const util_1 = require("../../helpers/util");
var ProgressSize;
(function (ProgressSize) {
    ProgressSize["sm"] = "sm";
    ProgressSize["md"] = "md";
    ProgressSize["lg"] = "lg";
})(ProgressSize || (exports.ProgressSize = ProgressSize = {}));
class Progress extends react_1.Component {
    constructor() {
        super(...arguments);
        this.id = this.props.id || (0, util_1.getUniqueId)();
    }
    render() {
        const _a = this.props, { 
        /* eslint-disable @typescript-eslint/no-unused-vars */
        id, size, 
        /* eslint-enable @typescript-eslint/no-unused-vars */
        className, value, title, label, variant, measureLocation, min, max, valueText, isTitleTruncated, tooltipPosition, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, 'aria-describedby': ariaDescribedBy, helperText } = _a, props = tslib_1.__rest(_a, ["id", "size", "className", "value", "title", "label", "variant", "measureLocation", "min", "max", "valueText", "isTitleTruncated", "tooltipPosition", 'aria-label', 'aria-labelledby', 'aria-describedby', "helperText"]);
        const progressBarAriaProps = {
            'aria-valuemin': min,
            'aria-valuenow': value,
            'aria-valuemax': max
        };
        if (title || ariaLabelledBy) {
            progressBarAriaProps['aria-labelledby'] = title ? `${this.id}-description` : ariaLabelledBy;
        }
        if (ariaLabel) {
            progressBarAriaProps['aria-label'] = ariaLabel;
        }
        if (ariaDescribedBy) {
            progressBarAriaProps['aria-describedby'] = ariaDescribedBy;
        }
        if (valueText) {
            progressBarAriaProps['aria-valuetext'] = valueText;
        }
        if (!title && !ariaLabelledBy && !ariaLabel) {
            /* eslint-disable no-console */
            console.warn('One of aria-label or aria-labelledby properties should be passed when using the progress component without a title.');
        }
        const scaledValue = Math.min(100, Math.max(0, Math.floor(((value - min) / (max - min)) * 100))) || 0;
        return ((0, jsx_runtime_1.jsx)("div", Object.assign({}, props, { className: (0, react_styles_1.css)(progress_1.default.progress, progress_1.default.modifiers[variant], ['inside', 'outside'].includes(measureLocation) && progress_1.default.modifiers[measureLocation], measureLocation === 'inside' ? progress_1.default.modifiers[ProgressSize.lg] : progress_1.default.modifiers[size], !title && progress_1.default.modifiers.singleline, className), id: this.id, children: (0, jsx_runtime_1.jsx)(ProgressContainer_1.ProgressContainer, { parentId: this.id, value: scaledValue, title: title, label: label, variant: variant, measureLocation: measureLocation, progressBarAriaProps: progressBarAriaProps, isTitleTruncated: isTitleTruncated, tooltipPosition: tooltipPosition, helperText: helperText }) })));
    }
}
exports.Progress = Progress;
Progress.displayName = 'Progress';
Progress.defaultProps = {
    className: '',
    measureLocation: ProgressContainer_1.ProgressMeasureLocation.top,
    variant: null,
    id: '',
    title: '',
    min: 0,
    max: 100,
    size: null,
    label: null,
    value: 0,
    valueText: null,
    isTitleTruncated: false,
    tooltipPosition: 'top',
    'aria-label': null,
    'aria-labelledby': null,
    'aria-describedby': null
};
//# sourceMappingURL=Progress.js.map