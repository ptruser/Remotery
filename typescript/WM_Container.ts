
namespace WM
{
    export class Container extends Control
    {
        static TemplateHTML = "<div class='Container'></div>";

        static SnapBorderSize = 5;

        // List of controls contained by the window, in z-order
        protected Controls: Control[] = [];

        constructor(position: int2, size: int2, node?: DOM.Node)
        {
            super(node ? node : new DOM.Node(Container.TemplateHTML), position, size);
        }

        Add(control: Control) : Control
        {
            this.Controls.push(control);
            control.ParentContainer = this;
            control.Show();
            return control;
        }

        SetTopControl(control: Control) : void
        {
            // ZINDEX needs to be relative to parent!
            
            // Bring the control to the top of the control List
            let top_index = this.Controls.indexOf(control);
            if (top_index != -1)
            {
                this.Controls.splice(top_index, 1);
                this.Controls.push(control);

                // Set a CSS z-index for each visible control from the bottom-up
                for (let i = 0; i < this.Controls.length; i++)
                {
                    let control = this.Controls[i];
                    if (!control.Visible)
                        continue;

			        // Ensure there's space between each window for the elements inside to be sorted
			        let z = (i + 1) * 10;
                    control.ZIndex = z;
                }
            }
        }

        WillControlSnap(pos: int2, mask: int2, top_left: int2, bottom_right: int2) : int2
        {
            // Distance from input position to opposing corners of the control
            let d_tl = int2.Abs(int2.Sub(pos, top_left));
            let d_br = int2.Abs(int2.Sub(pos, bottom_right));

            // Are any of the distances within the snap border size?
            let out_mask = new int2(0, 0);
            let b = Container.SnapBorderSize;
            if (mask.x != 0)
            {
                if (d_tl.x < b)
                    out_mask.x = -1;
                if (d_br.x < b)
                    out_mask.x = 1;
            }
            if (mask.y != 0)
            {
                if (d_tl.y < b)
                    out_mask.y = -1;
                if (d_br.y < b)
                    out_mask.y = 1;
            }

            // Return the out mask if it says a control will snap
            if (out_mask.x != 0 || out_mask.y != 0)
                return out_mask;

            return null;
        }

        GetSnapControls(pos: int2, mask: int2, excluding: Control, controls: [Control,int2][])
        {
            // Selects between control edge and a border-distance outside the control edge
            let b = Container.SnapBorderSize;

            // Gather nearby snap controls
            let snapped = false;
            for (let control of this.Controls)
            {
                if (control == excluding)
                    continue;

                var top_left = control.TopLeft;
                var bottom_right = control.BottomRight;
                let out_mask = this.WillControlSnap(pos, mask, top_left, bottom_right);
                if (out_mask != null)
                    controls.push([control, out_mask]);
            }

            // Snap to parent container bounds
            /*snapped = this.SnapControl(
                pos,
                snap_pos,
                mask,
                p_mask,
                n_mask,
                new int2(b),
                int2.Sub(this.Size, new int2(b))) || snapped;

            return snapped ? snap_pos : null;*/
        }

        SnapControl(pos: int2, snap_pos: int2, mask: int2, p_mask: int2, n_mask: int2, top_left: int2, bottom_right: int2) : boolean
        {
            let b = Container.SnapBorderSize;
            let snapped = false;

            // Distance from input position to opposing corners of the control
            let d_tl = int2.Abs(int2.Sub(pos, top_left));
            let d_br = int2.Abs(int2.Sub(pos, bottom_right));

            // If any distances are within the snap border, move the snap position to them
            if (mask.x != 0)
            {
                if (d_tl.x < b)
                {
                    snap_pos.x = top_left.x - p_mask.x;
                    snapped = true;
                }                    
                if (d_br.x < b)
                {
                    snap_pos.x = bottom_right.x + n_mask.x;
                    snapped = true;
                }
            }
            if (mask.y != 0)
            {
                if (d_tl.y < b)
                {
                    snap_pos.y = top_left.y - p_mask.y;
                    snapped = true;
                }                    
                if (d_br.y < b)
                {
                    snap_pos.y = bottom_right.y + n_mask.y;
                    snapped = true;
                }
            }

            return snapped;
        }

        GetSnapEdge(pos: int2, mask: int2, excluding: Control[]) : int2
        {
            // Selects between control edge and a border-distance outside the control edge
            let b = Container.SnapBorderSize;
            let p_mask = int2.Mul(int2.Max0(mask), new int2(b - 1));
            let n_mask = int2.Mul(int2.Min0(mask), new int2(-b + 1));

            // Start off with no snap adjustment
            let snap_pos = pos.Copy();

            // Snap to sibling container bounds
            let snapped = false;
            for (let control of this.Controls)
            {
                if (excluding.indexOf(control) != -1)
                    continue;

                var top_left = control.TopLeft;
                var bottom_right = control.BottomRight;

                snapped = this.SnapControl(
                    pos,
                    snap_pos,
                    mask,
                    p_mask,
                    n_mask,
                    control.TopLeft,
                    control.BottomRight) || snapped;
            }

            // Snap to parent container bounds
            let parent_size = this.ControlParentNode.Size;
            snapped = this.SnapControl(
                pos,
                snap_pos,
                mask,
                p_mask,
                n_mask,
                new int2(b),
                int2.Sub(parent_size, new int2(b))) || snapped;

            return snapped ? snap_pos : null;
        }

        // Returns the node which all controls added to the container are parented to
        get ControlParentNode() : DOM.Node
        {
            return this.Node;
        }

        protected SetSize(size: int2) : void
        {
            // Set size on super and notify child controls
            super.SetSize(size);
            this.UpdateControlSizes();
        }

        public UpdateControlSizes()
        {
            // This gets called from the super call in the constructor!
            // ...which is to be expected from the overridden Size property.
            if (this.Controls)
            {
                for (let control of this.Controls)
                    control.OnParentResize();
            }
        }
    }
}
