"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataListToggle = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const data_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DataList/data-list"));
const Button_1 = require("../Button");
const DataListToggle = (_a) => {
    var { className = '', isExpanded = false, 'aria-controls': ariaControls = '', 'aria-label': ariaLabel = 'Details', rowid = '', id, buttonProps } = _a, props = tslib_1.__rest(_a, ["className", "isExpanded", 'aria-controls', 'aria-label', "rowid", "id", "buttonProps"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(data_list_1.default.dataListItemControl, className) }, props, { children: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(data_list_1.default.dataListToggle), children: (0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ id: id, variant: Button_1.ButtonVariant.plain, "aria-controls": ariaControls !== '' && ariaControls, "aria-label": ariaLabel, "aria-labelledby": ariaLabel !== 'Details' ? null : `${rowid} ${id}`, "aria-expanded": isExpanded }, buttonProps, { icon: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(data_list_1.default.dataListToggleIcon), children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }) })) }) })));
};
exports.DataListToggle = DataListToggle;
exports.DataListToggle.displayName = 'DataListToggle';
//# sourceMappingURL=DataListToggle.js.map