"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataListControl = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const data_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DataList/data-list"));
const DataListControl = (_a) => {
    var { children, className = '' } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(data_list_1.default.dataListItemControl, className) }, props, { children: children })));
};
exports.DataListControl = DataListControl;
exports.DataListControl.displayName = 'DataListControl';
//# sourceMappingURL=DataListControl.js.map