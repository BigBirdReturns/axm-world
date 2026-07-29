using System.Collections.Generic;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Presentation-only receiver for exact Arc action state. Implementations may
    /// render, animate, play effects, move cameras, update HUDs, and emit local
    /// feedback. They may not mutate action state, admit input, or accept outcomes.
    /// </summary>
    public interface IActionPresentationAdapter
    {
        string AdapterId { get; }
        bool DiagnosticOnly { get; }
        void Initialize(ActionSpecProjection spec, ActionSimulationState state);
        void Render(ActionSimulationState state, float interpolation);
        void ApplyEvents(IReadOnlyList<ActionEvent> events);
        bool UsesUnityPhysicsAuthority();
    }
}
