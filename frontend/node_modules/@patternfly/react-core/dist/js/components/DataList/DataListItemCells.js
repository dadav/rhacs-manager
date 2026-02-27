"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataListItemCells = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const data_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DataList/data-list"));
const DataListItemCells = (_a) => {
    var { className = '', dataListCells, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rowid = '' } = _a, props = tslib_1.__rest(_a, ["className", "dataListCells", "rowid"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(data_list_1.default.dataListItemContent, className) }, props, { children: dataListCells })));
};
exports.DataListItemCells = DataListItemCells;
exports.DataListItemCells.displayName = 'DataListItemCells';
//# sourceMappingURL=DataListItemCells.js.map