"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tile = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const tile_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Tile/tile"));
const react_styles_1 = require("@patternfly/react-styles");
const Tile = (_a) => {
    var { children, title, icon, isStacked, isSelected, isDisabled, isDisplayLarge, className } = _a, props = tslib_1.__rest(_a, ["children", "title", "icon", "isStacked", "isSelected", "isDisabled", "isDisplayLarge", "className"]);
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ role: "option", "aria-selected": isSelected }, (isDisabled && { 'aria-disabled': isDisabled }), { className: (0, react_styles_1.css)(tile_1.default.tile, isSelected && tile_1.default.modifiers.selected, isDisabled && tile_1.default.modifiers.disabled, isDisplayLarge && tile_1.default.modifiers.displayLg, className), tabIndex: 0 }, props, { children: [(0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(tile_1.default.tileHeader, isStacked && tile_1.default.modifiers.stacked), children: [icon && (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(tile_1.default.tileIcon), children: icon }), (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(tile_1.default.tileTitle), children: title })] }), children && (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(tile_1.default.tileBody), children: children })] })));
};
exports.Tile = Tile;
exports.Tile.displayName = 'Tile';
//# sourceMappingURL=Tile.js.map