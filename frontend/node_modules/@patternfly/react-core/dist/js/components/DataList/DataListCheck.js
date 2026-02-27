"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataListCheck = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const data_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DataList/data-list"));
const Checkbox_1 = require("../Checkbox");
const GenerateId_1 = require("../../helpers/GenerateId/GenerateId");
const DataListCheck = (_a) => {
    var { id, className, onChange, isValid = true, isDisabled = false, isChecked, checked, defaultChecked, otherControls = false } = _a, props = tslib_1.__rest(_a, ["id", "className", "onChange", "isValid", "isDisabled", "isChecked", "checked", "defaultChecked", "otherControls"]);
    const check = ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(data_list_1.default.dataListCheck), children: (0, jsx_runtime_1.jsx)(GenerateId_1.GenerateId, { children: (randomId) => ((0, jsx_runtime_1.jsx)(Checkbox_1.Checkbox, Object.assign({ id: id !== null && id !== void 0 ? id : `datalist-check-${randomId}`, isChecked: isChecked, checked: checked, defaultChecked: defaultChecked, onChange: onChange, "aria-invalid": !isValid, isDisabled: isDisabled, isLabelWrapped: true }, props))) }) }));
    return ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [!otherControls && (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(data_list_1.default.dataListItemControl, className), children: check }), otherControls && check] }));
};
exports.DataListCheck = DataListCheck;
exports.DataListCheck.displayName = 'DataListCheck';
//# sourceMappingURL=DataListCheck.js.map