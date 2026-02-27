"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListItem = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/List/list"));
const react_styles_1 = require("@patternfly/react-styles");
const ListItem = (_a) => {
    var { className, children = null, icon = null } = _a, props = tslib_1.__rest(_a, ["className", "children", "icon"]);
    return ((0, jsx_runtime_1.jsxs)("li", Object.assign({ className: (0, react_styles_1.css)(icon && list_1.default.listItem, className) }, props, { children: [icon && (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(list_1.default.listItemIcon), children: icon }), (0, jsx_runtime_1.jsx)("span", { className: icon && (0, react_styles_1.css)(`${list_1.default.list}__item-text`), children: children })] })));
};
exports.ListItem = ListItem;
exports.ListItem.displayName = 'ListItem';
//# sourceMappingURL=ListItem.js.map