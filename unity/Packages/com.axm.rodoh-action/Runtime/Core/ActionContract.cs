using System;
using System.Collections.Generic;

namespace Axm.Rodoh.Action
{
    public static class ActionContract
    {
        public const string ProjectionFormat = "rodoh-unity-action-spec/1";
        public const string SourceSpecFormat = "axm-action-spec/1";
        public const string SourceReceiptFormat = "axm-action-receipt/1";
        public const string CandidateFormat = "rodoh-action-execution-candidate/1";
        public const string RuntimeVersion = "1.0.0";
        public const string SemanticRuntimeVersion = "1.1.0";
        public const int TickRate = 30;
        public const int ButtonMask = 31;

        public const int Light = 1;
        public const int Heavy = 2;
        public const int Dodge = 4;
        public const int Parry = 8;
        public const int Interact = 16;

        public static bool IsRuntimeVersion(string value)
        {
  return value == RuntimeVersion || value == SemanticRuntimeVersion;
        }

        public static bool IsArenaKit(string value)
        {
            return value == "ring" || value == "lane" || value == "islands";
        }

        public static bool IsPlayerKit(string value)
        {
            return value == "staff" || value == "blade" || value == "hammer";
        }

        public static bool IsEnemyKit(string value)
        {
            return value == "skirmisher" || value == "duelist" || value == "swarm" || value == "hexer" || value == "breaker";
        }
    }

    [Serializable]
    public sealed class ActionAttackLaw
    {
        public string id = "light";
        public int startupTicks;
        public int activeTicks;
        public int recoveryTicks;
        public int damage;
        public int range;
        public int coneNumerator;
        public int coneDenominator = 1;
        public int knockback;
    }

    [Serializable]
    public sealed class ActionPlayerLaw
    {
        public string kit = "staff";
        public int maxHealth;
        public int radius;
        public int movePerTick;
        public int dodgePerTick;
        public int dodgeTicks;
        public int dodgeInvulnerableTicks;
        public int parryTicks;
        public int parryActiveTicks;
        public int parryRecoveryTicks;
        public int staggerTicks;
        public ActionAttackLaw[] attacks = Array.Empty<ActionAttackLaw>();
    }

    [Serializable]
    public sealed class ActionEnemyLaw
    {
        public string kit = "skirmisher";
        public int maxHealth;
        public int radius;
        public int movePerTick;
        public int attackRange;
        public int attackDamage;
        public int telegraphTicks;
        public int activeTicks;
        public int recoveryTicks;
        public int staggerTicks;
    }

    [Serializable]
    public sealed class ActionObjectiveTarget
    {
        public string id = string.Empty;
        public int x;
        public int y;
        public int radius;
    }

    [Serializable]
    public sealed class ActionObjectiveSemanticCompletion
    {
        public string kind = string.Empty;
        public int targetCount;
        public int targetTicks;
        public ActionObjectiveTarget[] targets = Array.Empty<ActionObjectiveTarget>();
        public ActionObjectiveTarget target;
    }

    [Serializable]
    public sealed class ActionObjectiveSpec
    {
        public string id = string.Empty;
        public string label = string.Empty;
        public string brief = string.Empty;
        public string enemyKit = "skirmisher";
        public int enemyCount;
        public int targetDefeats;
        public string failureKind = string.Empty;
        public double severity;
        public ActionObjectiveSemanticCompletion semanticCompletion;
    }

    [Serializable]
    public sealed class ActionArenaSpec
    {
        public string kit = "ring";
        public int radius;
    }

    [Serializable]
    public sealed class ActionCompletionSpec
    {
        public string kind = "clear";
        public int successObjectiveCount;
        public int partialObjectiveCount;
    }

    [Serializable]
    public sealed class ActionSpecProjection
    {
        public string format = ActionContract.ProjectionFormat;
        public string sourceFormat = ActionContract.SourceSpecFormat;
        public string sourceSpecDigest = string.Empty;
        public string sourceArcDigest = string.Empty;
        public string runtimeVersion = ActionContract.RuntimeVersion;
        public string challengeId = string.Empty;
        public string title = string.Empty;
        public string difficultyModeId;
        public string timingProfileId;
        public int tickRate = ActionContract.TickRate;
        public int maxTicks;
        public ActionArenaSpec arena = new ActionArenaSpec();
        public ActionPlayerLaw player = new ActionPlayerLaw();
        public ActionEnemyLaw[] enemyLaws = Array.Empty<ActionEnemyLaw>();
        public ActionObjectiveSpec[] objectives = Array.Empty<ActionObjectiveSpec>();
        public ActionCompletionSpec completion = new ActionCompletionSpec();

        public List<string> Validate()
        {
            var errors = new List<string>();
            if (format != ActionContract.ProjectionFormat) errors.Add("Unsupported Unity action projection format.");
            if (sourceFormat != ActionContract.SourceSpecFormat) errors.Add("Projection does not name axm-action-spec/1 as its source.");
            if (string.IsNullOrWhiteSpace(sourceSpecDigest) || !sourceSpecDigest.StartsWith("actspec1_", StringComparison.Ordinal)) errors.Add("Source action-spec digest is absent or malformed.");
            if (string.IsNullOrWhiteSpace(sourceArcDigest) || !sourceArcDigest.StartsWith("cart1_", StringComparison.Ordinal)) errors.Add("Source cartridge digest is absent or malformed.");
            if (!ActionContract.IsRuntimeVersion(runtimeVersion)) errors.Add("Unsupported action runtime version.");
            if (timingProfileId != null && string.IsNullOrWhiteSpace(timingProfileId)) errors.Add("Timing-profile identity is empty.");
            if (tickRate != ActionContract.TickRate) errors.Add("Action projection must run at exactly 30 Hz.");
            if (maxTicks <= 0 || maxTicks > 600 * ActionContract.TickRate) errors.Add("maxTicks is outside the v1 bound.");
            if (arena == null || !ActionContract.IsArenaKit(arena.kit) || arena.radius < 1000 || arena.radius > 20000) errors.Add("Arena law is missing or outside the v1 bound.");
            if (player == null || !ActionContract.IsPlayerKit(player.kit)) errors.Add("Player law is missing or unknown.");
            if (player != null)
            {
                if (player.maxHealth <= 0 || player.radius <= 0 || player.movePerTick <= 0) errors.Add("Player movement or health law is invalid.");
                if (player.attacks == null || player.attacks.Length != 2) errors.Add("Action v1 requires exactly light and heavy attack laws.");
                else
                {
                    var ids = new HashSet<string>(StringComparer.Ordinal);
                    foreach (var attack in player.attacks)
                    {
                        if (attack == null || (attack.id != "light" && attack.id != "heavy")) errors.Add("Unknown player attack law.");
                        else if (!ids.Add(attack.id)) errors.Add("Duplicate player attack law.");
                        if (attack == null || attack.startupTicks < 0 || attack.activeTicks <= 0 || attack.recoveryTicks < 0 || attack.damage <= 0 || attack.range <= 0 || attack.coneDenominator <= 0) errors.Add("Player attack timing or geometry is invalid.");
                    }
                }
            }

            var enemyIds = new HashSet<string>(StringComparer.Ordinal);
            if (enemyLaws == null || enemyLaws.Length != 5) errors.Add("Action v1 requires all five enemy laws.");
            if (enemyLaws != null)
            {
                foreach (var law in enemyLaws)
                {
                    if (law == null || !ActionContract.IsEnemyKit(law.kit)) errors.Add("Unknown enemy law.");
                    else if (!enemyIds.Add(law.kit)) errors.Add("Duplicate enemy law.");
                    if (law == null || law.maxHealth <= 0 || law.radius <= 0 || law.movePerTick <= 0 || law.attackRange <= 0 || law.attackDamage <= 0 || law.telegraphTicks <= 0 || law.activeTicks <= 0 || law.recoveryTicks < 0 || law.staggerTicks <= 0) errors.Add("Enemy timing, geometry, or health law is invalid.");
                }
            }

            var objectiveIds = new HashSet<string>(StringComparer.Ordinal);
  var semanticObjectives = 0;
  if (objectives == null || objectives.Length == 0) errors.Add("Action encounter has no objectives.");
            if (objectives != null)
            {
                foreach (var objective in objectives)
                {
                    if (objective == null || string.IsNullOrWhiteSpace(objective.id)) errors.Add("Action objective id is absent.");
                    else if (!objectiveIds.Add(objective.id)) errors.Add("Duplicate action objective id.");
                    if (objective == null || !ActionContract.IsEnemyKit(objective.enemyKit) || !enemyIds.Contains(objective.enemyKit)) errors.Add("Action objective references an unavailable enemy law.");
          if (objective != null && objective.semanticCompletion == null)
          {
              if (objective.enemyCount < 1 || objective.enemyCount > 12 || objective.targetDefeats < 1 || objective.targetDefeats > objective.enemyCount) errors.Add("Legacy action objective population is outside the v1 bound.");
          }
          else if (objective != null && (objective.enemyCount < 0 || objective.enemyCount > 12 || objective.targetDefeats < 0 || objective.targetDefeats > objective.enemyCount))
          {
              errors.Add("Semantic action objective pressure population is outside the v1.1 bound.");
          }
                    if (objective != null && (double.IsNaN(objective.severity) || double.IsInfinity(objective.severity) || objective.severity < 0 || objective.severity > 1)) errors.Add("Action objective severity is invalid.");
          if (objective != null && objective.semanticCompletion != null)
          {
              semanticObjectives += 1;
              if (runtimeVersion == ActionContract.RuntimeVersion) errors.Add("Action runtime 1.0 cannot carry semantic objective law.");
              var semantic = objective.semanticCompletion;
              var arenaRadius = arena == null ? 0 : arena.radius;
              if (semantic.kind == "interact_count")
              {
                  if (semantic.targetCount < 1 || semantic.targetCount > 16) errors.Add("Interact objective target count is outside the v1.1 bound.");
                  if (semantic.targets == null || semantic.targets.Length != semantic.targetCount) errors.Add("Interact objective target set does not match targetCount.");
                  var targetIds = new HashSet<string>(StringComparer.Ordinal);
                  foreach (var target in semantic.targets ?? Array.Empty<ActionObjectiveTarget>())
                  {
                      if (target == null || string.IsNullOrWhiteSpace(target.id)) errors.Add("Interact objective target identity is absent.");
                      else if (!targetIds.Add(target.id)) errors.Add("Interact objective target identity is duplicated.");
                      if (target == null || target.radius < 300 || target.radius > 3000) errors.Add("Interact objective target radius is outside the v1.1 bound.");
                      if (target != null && (Math.Abs(target.x) > arenaRadius || Math.Abs(target.y) > arenaRadius)) errors.Add("Interact objective target lies outside the arena.");
                  }
              }
              else if (semantic.kind == "hold_ticks")
              {
                  if (semantic.targetTicks < 1 || semantic.targetTicks > 18000) errors.Add("Hold objective duration is outside the v1.1 bound.");
                  if (semantic.target == null || string.IsNullOrWhiteSpace(semantic.target.id)) errors.Add("Hold objective target identity is absent.");
                  if (semantic.target == null || semantic.target.radius < 300 || semantic.target.radius > 3000) errors.Add("Hold objective target radius is outside the v1.1 bound.");
                  if (semantic.target != null && (Math.Abs(semantic.target.x) > arenaRadius || Math.Abs(semantic.target.y) > arenaRadius)) errors.Add("Hold objective target lies outside the arena.");
              }
              else errors.Add("Unknown semantic objective completion law.");
          }
                }
  }
  if (runtimeVersion == ActionContract.SemanticRuntimeVersion && semanticObjectives == 0) errors.Add("Action runtime 1.1 requires at least one semantic objective.");

  if (completion == null || (completion.kind != "clear" && completion.kind != "survive")) errors.Add("Unknown action completion law.");
            else
            {
                var count = objectives == null ? 0 : objectives.Length;
                if (completion.partialObjectiveCount < 0 || completion.partialObjectiveCount > count) errors.Add("Partial completion threshold is outside the objective set.");
                if (completion.kind == "clear" && (completion.successObjectiveCount < 1 || completion.successObjectiveCount > count)) errors.Add("Success completion threshold is outside the objective set.");
            }
            return errors;
        }

        public ActionEnemyLaw EnemyLaw(string kit)
        {
            if (enemyLaws == null) throw new InvalidOperationException("Enemy laws are absent.");
            foreach (var law in enemyLaws)
            {
                if (law != null && law.kit == kit) return law;
            }
            throw new InvalidOperationException("Enemy law not found: " + kit);
        }

        public ActionAttackLaw AttackLaw(string id)
        {
            if (player == null || player.attacks == null) throw new InvalidOperationException("Player attack laws are absent.");
            foreach (var attack in player.attacks)
            {
                if (attack != null && attack.id == id) return attack;
            }
            throw new InvalidOperationException("Player attack law not found: " + id);
        }
    }

    [Serializable]
    public struct ActionInputFrame : IEquatable<ActionInputFrame>
    {
        public int moveX;
        public int moveY;
        public int aimX;
        public int aimY;
        public int buttons;

        public static ActionInputFrame Normalize(ActionInputFrame input)
        {
            input.moveX = Math.Sign(input.moveX);
            input.moveY = Math.Sign(input.moveY);
            input.aimX = Math.Sign(input.aimX);
            input.aimY = Math.Sign(input.aimY);
            input.buttons = Math.Max(0, input.buttons) & ActionContract.ButtonMask;
            return input;
        }

        public bool Equals(ActionInputFrame other)
        {
            return moveX == other.moveX && moveY == other.moveY && aimX == other.aimX && aimY == other.aimY && buttons == other.buttons;
        }

        public override bool Equals(object obj)
        {
            return obj is ActionInputFrame other && Equals(other);
        }

        public override int GetHashCode()
        {
            unchecked
            {
                var hash = moveX;
                hash = (hash * 397) ^ moveY;
                hash = (hash * 397) ^ aimX;
                hash = (hash * 397) ^ aimY;
                hash = (hash * 397) ^ buttons;
                return hash;
            }
        }
    }

    [Serializable]
    public sealed class ActionInputRun
    {
        public int ticks;
        public ActionInputFrame input;
    }

    public enum ActionPlayerMode
    {
        Idle,
        Light,
        Heavy,
        Dodge,
        Parry,
        Stagger,
        Defeated
    }

    public enum ActionEnemyMode
    {
        Approach,
        Telegraph,
        Active,
        Recover,
        Stagger,
        Defeated
    }

    [Serializable]
    public sealed class ActionPlayerState
    {
        public int x;
        public int y;
        public int facingX = 1;
        public int facingY;
        public int health;
        public ActionPlayerMode mode;
        public int modeTick;
        public readonly HashSet<string> hitEnemyIds = new HashSet<string>(StringComparer.Ordinal);
    }

    [Serializable]
    public sealed class ActionEnemyState
    {
        public string id = string.Empty;
        public string objectiveId = string.Empty;
        public string kit = "skirmisher";
        public int x;
        public int y;
        public int health;
        public ActionEnemyMode mode;
        public int modeTick;
        public bool attackResolved;
    }

    [Serializable]
    public sealed class ActionObjectiveProgress
    {
        public string id = string.Empty;
        public int defeated;
        public int target;
        public bool completed;
        public string kind;
        public int progress;
    }

    [Serializable]
    public sealed class ActionStats
    {
        public int hitsLanded;
        public int heavyHits;
        public int damageTaken;
        public int parries;
        public int dodgedAttacks;
        public int enemiesDefeated;
        public int objectiveInteractions;
        public int objectiveHoldTicks;

        public ActionStats Clone()
        {
            return (ActionStats)MemberwiseClone();
        }
    }

    [Serializable]
    public sealed class ActionEvent
    {
        public string type = string.Empty;
        public string objectiveId;
        public string enemyId;
        public string action;
        public string attack;
        public string outcome;
        public string targetId;
        public int progress;
        public int target;
        public int damage;
        public int health;
        public bool defeated;
    }

    [Serializable]
    public sealed class ActionSimulationResult
    {
        public string outcome = "failure";
        public string[] completedObjectiveIds = Array.Empty<string>();
        public ActionObjectiveProgress[] objectives = Array.Empty<ActionObjectiveProgress>();
        public int playerHealth;
        public bool playerDefeated;
        public int totalTicks;
        public ActionStats stats = new ActionStats();
    }

    [Serializable]
    public sealed class ActionSimulationState
    {
        public string format = "axm-action-state/1";
        public uint seed;
        public int tick;
        public int activeObjectiveIndex;
        public ActionPlayerState player = new ActionPlayerState();
        public readonly List<ActionEnemyState> enemies = new List<ActionEnemyState>();
        public readonly List<string> completedObjectiveIds = new List<string>();
        public readonly Dictionary<string, int> objectiveProgress = new Dictionary<string, int>(StringComparer.Ordinal);
        public readonly HashSet<string> completedInteractionTargetIds = new HashSet<string>(StringComparer.Ordinal);
        public ActionStats stats = new ActionStats();
        public int previousButtons;
        public readonly List<ActionEvent> events = new List<ActionEvent>();
        public ActionSimulationResult result;
    }

    [Serializable]
    public sealed class ActionExecutionCandidate
    {
        public string format = ActionContract.CandidateFormat;
        public string sourceReceiptFormat = ActionContract.SourceReceiptFormat;
        public string runtimeVersion = ActionContract.RuntimeVersion;
        public string arcDigest = string.Empty;
        public string challengeId = string.Empty;
        public string difficultyModeId;
        public string timingProfileId;
        public string actionSpecDigest = string.Empty;
        public int cycle;
        public uint seed;
        public string controlledAgentId = string.Empty;
        public string[] partyAgentIds = Array.Empty<string>();
        public ActionInputRun[] trace = Array.Empty<ActionInputRun>();
        public int totalTicks;
        public ActionSimulationResult provisionalResult = new ActionSimulationResult();
        public string authority = "Arc replay required";
    }
}
