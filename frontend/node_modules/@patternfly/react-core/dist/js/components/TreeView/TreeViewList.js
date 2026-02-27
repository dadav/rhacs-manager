"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeViewList = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const Divider_1 = require("../Divider");
const tree_view_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/TreeView/tree-view"));
const TreeViewList = (_a) => {
    var { isNested = false, isMultiSelectable = false, toolbar, children, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby } = _a, props = tslib_1.__rest(_a, ["isNested", "isMultiSelectable", "toolbar", "children", 'aria-label', 'aria-labelledby']);
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [toolbar && ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [toolbar, (0, jsx_runtime_1.jsx)(Divider_1.Divider, {})] })), (0, jsx_runtime_1.jsx)("ul", Object.assign({ className: (0, react_styles_1.css)(`${tree_view_1.default.treeView}__list`), role: isNested ? 'group' : 'tree', "aria-multiselectable": isNested ? undefined : isMultiSelectable, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledby }, props, { children: children }))] }));
};
exports.TreeViewList = TreeViewList;
exports.TreeViewList.displayName = 'TreeViewList';
//# sourceMappingURL=TreeViewList.js.map