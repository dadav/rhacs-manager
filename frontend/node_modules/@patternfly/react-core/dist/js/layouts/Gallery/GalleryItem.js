"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GalleryItem = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const GalleryItem = (_a) => {
    var { children = null, component = 'div' } = _a, props = tslib_1.__rest(_a, ["children", "component"]);
    const Component = component;
    return (0, jsx_runtime_1.jsx)(Component, Object.assign({}, props, { children: children }));
};
exports.GalleryItem = GalleryItem;
exports.GalleryItem.displayName = 'GalleryItem';
//# sourceMappingURL=GalleryItem.js.map