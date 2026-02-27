"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DescriptionList = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const description_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DescriptionList/description-list"));
const helpers_1 = require("../../helpers");
const c_description_list_GridTemplateColumns_min_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_description_list_GridTemplateColumns_min'));
const c_description_list_m_horizontal__term_width_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_description_list_m_horizontal__term_width'));
const cssTermWidth = {
    name: `--${description_list_1.default.descriptionList}_term-width`
};
const setBreakpointModifiers = (prefix, modifiers) => {
    const mods = modifiers;
    return Object.keys(mods || {}).reduce((acc, curr) => curr === 'default' ? Object.assign(Object.assign({}, acc), { [prefix]: mods[curr] }) : Object.assign(Object.assign({}, acc), { [`${prefix}-on-${curr}`]: mods[curr] }), {});
};
const DescriptionList = (_a) => {
    var { className = '', children = null, isHorizontal = false, isAutoColumnWidths, isAutoFit, isInlineGrid, isCompact, isFluid, isFillColumns, displaySize = 'default', columnModifier, autoFitMinModifier, termWidth, horizontalTermWidthModifier, orientation, style } = _a, props = tslib_1.__rest(_a, ["className", "children", "isHorizontal", "isAutoColumnWidths", "isAutoFit", "isInlineGrid", "isCompact", "isFluid", "isFillColumns", "displaySize", "columnModifier", "autoFitMinModifier", "termWidth", "horizontalTermWidthModifier", "orientation", "style"]);
    if (isAutoFit && autoFitMinModifier) {
        style = Object.assign(Object.assign({}, style), setBreakpointModifiers(c_description_list_GridTemplateColumns_min_1.default.name, autoFitMinModifier));
    }
    if (termWidth) {
        style = Object.assign(Object.assign({}, style), { [cssTermWidth.name]: termWidth });
    }
    if (isHorizontal && horizontalTermWidthModifier) {
        style = Object.assign(Object.assign({}, style), setBreakpointModifiers(c_description_list_m_horizontal__term_width_1.default.name, horizontalTermWidthModifier));
    }
    return ((0, jsx_runtime_1.jsx)("dl", Object.assign({ className: (0, react_styles_1.css)(description_list_1.default.descriptionList, (isHorizontal || isFluid) && description_list_1.default.modifiers.horizontal, isAutoColumnWidths && description_list_1.default.modifiers.autoColumnWidths, isAutoFit && description_list_1.default.modifiers.autoFit, (0, helpers_1.formatBreakpointMods)(columnModifier, description_list_1.default), (0, helpers_1.formatBreakpointMods)(orientation, description_list_1.default), isInlineGrid && description_list_1.default.modifiers.inlineGrid, isCompact && description_list_1.default.modifiers.compact, isFluid && description_list_1.default.modifiers.fluid, isFillColumns && description_list_1.default.modifiers.fillColumns, displaySize === 'lg' && description_list_1.default.modifiers.displayLg, displaySize === '2xl' && description_list_1.default.modifiers.display_2xl, className), style: style }, props, { children: children })));
};
exports.DescriptionList = DescriptionList;
exports.DescriptionList.displayName = 'DescriptionList';
//# sourceMappingURL=DescriptionList.js.map