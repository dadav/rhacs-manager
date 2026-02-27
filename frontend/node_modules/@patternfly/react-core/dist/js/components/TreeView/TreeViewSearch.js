"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeViewSearch = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const tree_view_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/TreeView/tree-view"));
const form_control_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/FormControl/form-control"));
const search_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/search-icon'));
const TreeViewSearch = (_a) => {
    var { className, onSearch, id, name, 'aria-label': ariaLabel } = _a, props = tslib_1.__rest(_a, ["className", "onSearch", "id", "name", 'aria-label']);
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(tree_view_1.default.treeViewSearch, className), children: (0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(form_control_1.default.formControl, form_control_1.default.modifiers.icon), children: [(0, jsx_runtime_1.jsx)("input", Object.assign({ onChange: onSearch, id: id, name: name, "aria-label": ariaLabel, type: "search" }, props)), (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(form_control_1.default.formControlUtilities), children: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(form_control_1.default.formControlIcon), children: (0, jsx_runtime_1.jsx)(search_icon_1.default, {}) }) })] }) }));
};
exports.TreeViewSearch = TreeViewSearch;
exports.TreeViewSearch.displayName = 'TreeViewSearch';
//# sourceMappingURL=TreeViewSearch.js.map