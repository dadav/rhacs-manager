"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataListDragButton = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const data_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DataList/data-list"));
const grip_vertical_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/grip-vertical-icon'));
const DataListDragButton = (_a) => {
    var { className = '', isDisabled = false } = _a, props = tslib_1.__rest(_a, ["className", "isDisabled"]);
    return ((0, jsx_runtime_1.jsx)("button", Object.assign({ className: (0, react_styles_1.css)(data_list_1.default.dataListItemDraggableButton, isDisabled && data_list_1.default.modifiers.disabled, className), type: "button", disabled: isDisabled }, props, { children: (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(data_list_1.default.dataListItemDraggableIcon), children: (0, jsx_runtime_1.jsx)(grip_vertical_icon_1.default, {}) }) })));
};
exports.DataListDragButton = DataListDragButton;
exports.DataListDragButton.displayName = 'DataListDragButton';
//# sourceMappingURL=DataListDragButton.js.map