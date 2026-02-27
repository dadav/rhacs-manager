"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressContainer = exports.ProgressVariant = exports.ProgressMeasureLocation = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const progress_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Progress/progress"));
const react_styles_1 = require("@patternfly/react-styles");
const Tooltip_1 = require("../Tooltip");
const check_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/check-circle-icon'));
const times_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/times-circle-icon'));
const exclamation_triangle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/exclamation-triangle-icon'));
const ProgressBar_1 = require("./ProgressBar");
const ProgressHelperText_1 = require("./ProgressHelperText");
var ProgressMeasureLocation;
(function (ProgressMeasureLocation) {
    ProgressMeasureLocation["outside"] = "outside";
    ProgressMeasureLocation["inside"] = "inside";
    ProgressMeasureLocation["top"] = "top";
    ProgressMeasureLocation["none"] = "none";
})(ProgressMeasureLocation || (exports.ProgressMeasureLocation = ProgressMeasureLocation = {}));
var ProgressVariant;
(function (ProgressVariant) {
    ProgressVariant["danger"] = "danger";
    ProgressVariant["success"] = "success";
    ProgressVariant["warning"] = "warning";
})(ProgressVariant || (exports.ProgressVariant = ProgressVariant = {}));
const variantToIcon = {
    danger: times_circle_icon_1.default,
    success: check_circle_icon_1.default,
    warning: exclamation_triangle_icon_1.default
};
const ProgressContainer = ({ progressBarAriaProps, value, title = '', parentId, label = null, variant = null, measureLocation = ProgressMeasureLocation.top, isTitleTruncated = false, tooltipPosition, helperText }) => {
    const StatusIcon = variantToIcon.hasOwnProperty(variant) && variantToIcon[variant];
    const [tooltip, setTooltip] = (0, react_1.useState)('');
    const titleRef = (0, react_1.useRef)(null);
    const updateTooltip = (event) => {
        if (event.target.offsetWidth < event.target.scrollWidth) {
            setTooltip(title || event.target.innerHTML);
        }
        else {
            setTooltip('');
        }
    };
    (0, react_1.useEffect)(() => {
        if (tooltip !== '') {
            titleRef.current.focus();
        }
    }, [tooltip]);
    const _isTruncatedAndString = isTitleTruncated && typeof title === 'string';
    const Title = ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(progress_1.default.progressDescription, _isTruncatedAndString && progress_1.default.modifiers.truncate), id: `${parentId}-description`, "aria-hidden": _isTruncatedAndString ? null : 'true', onMouseEnter: _isTruncatedAndString ? updateTooltip : null, onFocus: _isTruncatedAndString ? updateTooltip : null }, (_isTruncatedAndString && { tabIndex: 0 }), { ref: titleRef, children: title })));
    return ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [title && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [tooltip && (0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { position: tooltipPosition, content: tooltip, isVisible: true, triggerRef: titleRef }), Title] })), (measureLocation !== ProgressMeasureLocation.none || StatusIcon) && ((0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(progress_1.default.progressStatus), "aria-hidden": "true", children: [(measureLocation === ProgressMeasureLocation.top || measureLocation === ProgressMeasureLocation.outside) && ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(progress_1.default.progressMeasure), children: label || `${value}%` })), StatusIcon && ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(progress_1.default.progressStatusIcon), children: (0, jsx_runtime_1.jsx)(StatusIcon, {}) }))] })), (0, jsx_runtime_1.jsx)(ProgressBar_1.ProgressBar, { progressBarAriaProps: progressBarAriaProps, value: value, children: measureLocation === ProgressMeasureLocation.inside && `${value}%` }), helperText && (0, jsx_runtime_1.jsx)(ProgressHelperText_1.ProgressHelperText, { children: helperText })] }));
};
exports.ProgressContainer = ProgressContainer;
exports.ProgressContainer.displayName = 'ProgressContainer';
//# sourceMappingURL=ProgressContainer.js.map