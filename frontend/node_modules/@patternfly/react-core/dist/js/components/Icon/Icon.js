"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Icon = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const icon_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Icon/icon"));
const react_styles_1 = require("@patternfly/react-styles");
const Spinner_1 = require("../Spinner");
const Icon = (_a) => {
    var { children, className, progressIcon, size, iconSize, progressIconSize, status, isInline = false, isInProgress = false, defaultProgressArialabel = 'Loading...', shouldMirrorRTL = false } = _a, props = tslib_1.__rest(_a, ["children", "className", "progressIcon", "size", "iconSize", "progressIconSize", "status", "isInline", "isInProgress", "defaultProgressArialabel", "shouldMirrorRTL"]);
    const _progressIcon = progressIcon !== null && progressIcon !== void 0 ? progressIcon : (0, jsx_runtime_1.jsx)(Spinner_1.Spinner, { diameter: "1em", "aria-label": defaultProgressArialabel });
    return ((0, jsx_runtime_1.jsxs)("span", Object.assign({ className: (0, react_styles_1.css)(icon_1.default.icon, isInline && icon_1.default.modifiers.inline, isInProgress && icon_1.default.modifiers.inProgress, icon_1.default.modifiers[size], className) }, props, { children: [(0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(icon_1.default.iconContent, icon_1.default.modifiers[iconSize], icon_1.default.modifiers[status], shouldMirrorRTL && 'pf-v6-m-mirror-inline-rtl'), children: children }), isInProgress && ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(icon_1.default.iconProgress, icon_1.default.modifiers[progressIconSize], className), children: _progressIcon }))] })));
};
exports.Icon = Icon;
exports.Icon.displayName = 'Icon';
//# sourceMappingURL=Icon.js.map