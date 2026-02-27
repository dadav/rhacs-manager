"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClipboardCopyAction = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const clipboard_copy_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ClipboardCopy/clipboard-copy"));
const react_styles_1 = require("@patternfly/react-styles");
const ClipboardCopyAction = (_a) => {
    var { children = null, className = '' } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("span", Object.assign({ className: (0, react_styles_1.css)(clipboard_copy_1.default.clipboardCopyActionsItem, className) }, props, { children: children })));
};
exports.ClipboardCopyAction = ClipboardCopyAction;
exports.ClipboardCopyAction.displayName = 'ClipboardCopyAction';
//# sourceMappingURL=ClipboardCopyAction.js.map