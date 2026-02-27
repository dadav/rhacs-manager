"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClipboardCopyExpanded = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const clipboard_copy_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ClipboardCopy/clipboard-copy"));
const react_styles_1 = require("@patternfly/react-styles");
class ClipboardCopyExpanded extends react_1.Component {
    constructor(props) {
        super(props);
    }
    render() {
        const _a = this.props, { className, children, onChange, isReadOnly, isCode } = _a, props = tslib_1.__rest(_a, ["className", "children", "onChange", "isReadOnly", "isCode"]);
        return ((0, jsx_runtime_1.jsx)("div", Object.assign({ suppressContentEditableWarning: true, className: (0, react_styles_1.css)(clipboard_copy_1.default.clipboardCopyExpandableContent, className), onInput: (e) => onChange(e, e.target.innerText), contentEditable: !isReadOnly }, props, { children: isCode ? (0, jsx_runtime_1.jsx)("pre", { dir: "ltr", children: children }) : children })));
    }
}
exports.ClipboardCopyExpanded = ClipboardCopyExpanded;
ClipboardCopyExpanded.displayName = 'ClipboardCopyExpanded';
ClipboardCopyExpanded.defaultProps = {
    onChange: () => undefined,
    className: '',
    isReadOnly: false,
    isCode: false
};
//# sourceMappingURL=ClipboardCopyExpanded.js.map