"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DualListSelectorPane = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const dual_list_selector_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DualListSelector/dual-list-selector"));
const react_styles_1 = require("@patternfly/react-styles");
const helpers_1 = require("../../helpers");
const DualListSelectorListWrapper_1 = require("./DualListSelectorListWrapper");
const DualListSelectorContext_1 = require("./DualListSelectorContext");
const SearchInput_1 = require("../SearchInput");
const c_dual_list_selector__menu_MinHeight_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_dual_list_selector__menu_MinHeight'));
const DualListSelectorPane = (_a) => {
    var { isChosen = false, className = '', status = '', actions, searchInput, children, title = '', id = (0, helpers_1.getUniqueId)('dual-list-selector-pane'), isDisabled = false, listMinHeight } = _a, props = tslib_1.__rest(_a, ["isChosen", "className", "status", "actions", "searchInput", "children", "title", "id", "isDisabled", "listMinHeight"]);
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorPane, isChosen ? dual_list_selector_1.default.modifiers.chosen : 'pf-m-available', className) }, props, { children: [title && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorHeader), children: (0, jsx_runtime_1.jsx)("div", { className: `${dual_list_selector_1.default.dualListSelector}__title`, children: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorTitleText), children: title }) }) })), (actions || searchInput) && ((0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorTools), children: [searchInput && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorToolsFilter), children: searchInput ? searchInput : (0, jsx_runtime_1.jsx)(SearchInput_1.SearchInput, { isDisabled: isDisabled }) })), actions && (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorToolsActions), children: actions })] })), status && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorStatus), children: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorStatusText), id: `${id}-status`, children: status }) })), (0, jsx_runtime_1.jsx)(DualListSelectorContext_1.DualListSelectorPaneContext.Provider, { value: { isChosen }, children: (0, jsx_runtime_1.jsx)(DualListSelectorListWrapper_1.DualListSelectorListWrapper, Object.assign({ "aria-labelledby": `${id}-status`, id: `${id}-list` }, (listMinHeight && {
                    style: { [c_dual_list_selector__menu_MinHeight_1.default.name]: listMinHeight }
                }), { children: children })) })] })));
};
exports.DualListSelectorPane = DualListSelectorPane;
exports.DualListSelectorPane.displayName = 'DualListSelectorPane';
//# sourceMappingURL=DualListSelectorPane.js.map