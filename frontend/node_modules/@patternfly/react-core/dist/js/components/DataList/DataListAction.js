"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataListAction = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const data_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DataList/data-list"));
const util_1 = require("../../helpers/util");
const DataListAction = (_a) => {
    var { children, className, visibility, 
    /* eslint-disable @typescript-eslint/no-unused-vars */
    id, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy } = _a, props = tslib_1.__rest(_a, ["children", "className", "visibility", "id", 'aria-label', 'aria-labelledby']);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(data_list_1.default.dataListItemAction, (0, util_1.formatBreakpointMods)(visibility, data_list_1.default), className) }, props, { children: children })));
};
exports.DataListAction = DataListAction;
exports.DataListAction.displayName = 'DataListAction';
//# sourceMappingURL=DataListAction.js.map