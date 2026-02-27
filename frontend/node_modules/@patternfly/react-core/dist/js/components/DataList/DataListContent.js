"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataListContent = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const data_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DataList/data-list"));
const DataListContent = (_a) => {
    var { className = '', children = null, id = '', isHidden = false, 'aria-label': ariaLabel, hasNoPadding = false, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rowid = '' } = _a, props = tslib_1.__rest(_a, ["className", "children", "id", "isHidden", 'aria-label', "hasNoPadding", "rowid"]);
    return ((0, jsx_runtime_1.jsx)("section", Object.assign({ id: id, className: (0, react_styles_1.css)(data_list_1.default.dataListExpandableContent, className), hidden: isHidden, "aria-label": ariaLabel }, props, { children: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(data_list_1.default.dataListExpandableContentBody, hasNoPadding && data_list_1.default.modifiers.noPadding), children: children }) })));
};
exports.DataListContent = DataListContent;
exports.DataListContent.displayName = 'DataListContent';
//# sourceMappingURL=DataListContent.js.map