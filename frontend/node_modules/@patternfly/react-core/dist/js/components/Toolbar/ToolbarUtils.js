"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalBreakpoints = exports.ToolbarContentContext = exports.ToolbarContext = void 0;
const tslib_1 = require("tslib");
const react_1 = require("react");
const t_global_breakpoint_md_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/t_global_breakpoint_md'));
const t_global_breakpoint_lg_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/t_global_breakpoint_lg'));
const t_global_breakpoint_xl_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/t_global_breakpoint_xl'));
const t_global_breakpoint_2xl_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/t_global_breakpoint_2xl'));
exports.ToolbarContext = (0, react_1.createContext)({
    isExpanded: false,
    toggleIsExpanded: () => { },
    labelGroupContentRef: null,
    updateNumberFilters: () => { },
    numberOfFilters: 0,
    clearAllFilters: () => { }
});
exports.ToolbarContentContext = (0, react_1.createContext)({
    expandableContentRef: null,
    expandableContentId: '',
    labelContainerRef: null,
    clearAllFilters: () => { }
});
exports.globalBreakpoints = {
    md: parseInt(t_global_breakpoint_md_1.default.value) * 16,
    lg: parseInt(t_global_breakpoint_lg_1.default.value) * 16,
    xl: parseInt(t_global_breakpoint_xl_1.default.value) * 16,
    '2xl': parseInt(t_global_breakpoint_2xl_1.default.value) * 16
};
//# sourceMappingURL=ToolbarUtils.js.map