"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JumpLinksItem = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const jump_links_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/JumpLinks/jump-links"));
const JumpLinksList_1 = require("./JumpLinksList");
const Button_1 = require("../Button");
const JumpLinksItem = (_a) => {
    var { isActive, href, 
    // eslint-disable-next-line
    node, children, onClick, className } = _a, props = tslib_1.__rest(_a, ["isActive", "href", "node", "children", "onClick", "className"]);
    const childrenArr = react_1.Children.toArray(children);
    const sublists = childrenArr.filter((child) => child.type === JumpLinksList_1.JumpLinksList);
    children = childrenArr.filter((child) => child.type !== JumpLinksList_1.JumpLinksList);
    return ((0, jsx_runtime_1.jsxs)("li", Object.assign({ className: (0, react_styles_1.css)(jump_links_1.default.jumpLinksItem, isActive && jump_links_1.default.modifiers.current, className) }, (isActive && { 'aria-current': 'location' }), props, { children: [(0, jsx_runtime_1.jsx)("span", { className: jump_links_1.default.jumpLinksLink, children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.link, component: "a", href: href, onClick: onClick, children: (0, jsx_runtime_1.jsx)("span", { className: jump_links_1.default.jumpLinksLinkText, children: children }) }) }), sublists] })));
};
exports.JumpLinksItem = JumpLinksItem;
exports.JumpLinksItem.displayName = 'JumpLinksItem';
//# sourceMappingURL=JumpLinksItem.js.map