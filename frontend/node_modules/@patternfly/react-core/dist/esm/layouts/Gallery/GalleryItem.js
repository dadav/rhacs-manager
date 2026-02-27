import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
export const GalleryItem = (_a) => {
    var { children = null, component = 'div' } = _a, props = __rest(_a, ["children", "component"]);
    const Component = component;
    return _jsx(Component, Object.assign({}, props, { children: children }));
};
GalleryItem.displayName = 'GalleryItem';
//# sourceMappingURL=GalleryItem.js.map