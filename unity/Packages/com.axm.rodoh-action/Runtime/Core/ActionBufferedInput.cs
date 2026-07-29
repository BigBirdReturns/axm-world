using System;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Buffers player button edges across short deterministic-state lockouts. The
    /// buffer changes only which input frame enters the accepted trace. It never
    /// mutates action state, attack timing, damage, collision, or outcomes.
    /// </summary>
    public sealed class ActionBufferedInput
    {
        private readonly int _bufferTicks;
        private int _sampleTick;
        private int _lightUntil = -1;
        private int _heavyUntil = -1;
        private int _dodgeUntil = -1;
        private int _parryUntil = -1;

        public ActionBufferedInput(int bufferTicks)
        {
            if (bufferTicks < 0 || bufferTicks > 30) throw new ArgumentOutOfRangeException(nameof(bufferTicks));
            _bufferTicks = bufferTicks;
        }

        public int BufferTicks => _bufferTicks;

        public int PendingButtons
        {
            get
            {
                Expire();
                var value = 0;
                if (_lightUntil >= _sampleTick) value |= ActionContract.Light;
                if (_heavyUntil >= _sampleTick) value |= ActionContract.Heavy;
                if (_dodgeUntil >= _sampleTick) value |= ActionContract.Dodge;
                if (_parryUntil >= _sampleTick) value |= ActionContract.Parry;
                return value;
            }
        }

        public void Buffer(int buttons)
        {
            buttons &= ActionContract.Light | ActionContract.Heavy | ActionContract.Dodge | ActionContract.Parry;
            var until = _sampleTick + _bufferTicks;
            if ((buttons & ActionContract.Light) != 0) _lightUntil = Math.Max(_lightUntil, until);
            if ((buttons & ActionContract.Heavy) != 0) _heavyUntil = Math.Max(_heavyUntil, until);
            if ((buttons & ActionContract.Dodge) != 0) _dodgeUntil = Math.Max(_dodgeUntil, until);
            if ((buttons & ActionContract.Parry) != 0) _parryUntil = Math.Max(_parryUntil, until);
        }

        public ActionInputFrame Sample(ActionInputFrame continuous, ActionPlayerMode playerMode)
        {
            _sampleTick += 1;
            Expire();

            var buttons = continuous.buttons & ActionContract.Interact;
            if (playerMode == ActionPlayerMode.Idle)
            {
                // Defensive intent wins the next legal tick, followed by committed
                // heavy and light attacks. Lower-priority edges remain buffered.
                if (Consume(ActionContract.Dodge)) buttons |= ActionContract.Dodge;
                else if (Consume(ActionContract.Parry)) buttons |= ActionContract.Parry;
                else if (Consume(ActionContract.Heavy)) buttons |= ActionContract.Heavy;
                else if (Consume(ActionContract.Light)) buttons |= ActionContract.Light;
            }

            continuous.buttons = buttons;
            return ActionInputFrame.Normalize(continuous);
        }

        public void Reset()
        {
            _sampleTick = 0;
            _lightUntil = -1;
            _heavyUntil = -1;
            _dodgeUntil = -1;
            _parryUntil = -1;
        }

        private bool Consume(int button)
        {
            if (button == ActionContract.Dodge && _dodgeUntil >= _sampleTick)
            {
                _dodgeUntil = -1;
                return true;
            }
            if (button == ActionContract.Parry && _parryUntil >= _sampleTick)
            {
                _parryUntil = -1;
                return true;
            }
            if (button == ActionContract.Heavy && _heavyUntil >= _sampleTick)
            {
                _heavyUntil = -1;
                return true;
            }
            if (button == ActionContract.Light && _lightUntil >= _sampleTick)
            {
                _lightUntil = -1;
                return true;
            }
            return false;
        }

        private void Expire()
        {
            if (_lightUntil < _sampleTick) _lightUntil = -1;
            if (_heavyUntil < _sampleTick) _heavyUntil = -1;
            if (_dodgeUntil < _sampleTick) _dodgeUntil = -1;
            if (_parryUntil < _sampleTick) _parryUntil = -1;
        }
    }
}
