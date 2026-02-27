"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JumpLinksList = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const jump_links_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/JumpLinks/jump-links"));
const JumpLinksList = (_a) => {
    var { children, className } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("ul", Object.assign({ className: (0, react_styles_1.css)(jump_links_1.default.jumpLinksList, className), role: "list" }, props, { children: children })));
};
exports.JumpLinksList = JumpLinksList;
exports.JumpLinksList.displayName = 'JumpLinksList';
//# sourceMappingURL=JumpLinksList.js.map