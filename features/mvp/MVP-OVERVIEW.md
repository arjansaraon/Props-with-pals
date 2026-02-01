# MVP Overview: Props-With-Pals

> **Status**: Planning
>
> This folder contains feature specifications for the MVP release.

## MVP Goal

Successfully run a prop bet pool for a live event (e.g., Super Bowl) with 5+ friends.

## MVP Features

### Captain Features
1. **Create Pool** - Name, buy-in, generate invite code
2. **Add Props** - Question + options + point value
3. **Edit Props** - Modify before lock
4. **Share Pool** - Invite code/link
5. **Lock Betting** - Prevent new picks
6. **Mark Results** - Select correct answer per prop
7. **View Leaderboard** - See final standings

### Participant Features
1. **Join Pool** - Enter invite code + name
2. **View Props** - See all questions and point values
3. **Submit Picks** - Select one option per prop
4. **View My Picks** - See what I picked
5. **View Results** - See correct answers + my points
6. **View Leaderboard** - See rankings

## Feature Specs

Detailed specifications will be added as we build:

- [ ] `create-pool.md` - Pool creation flow
- [ ] `add-props.md` - Prop bet creation
- [ ] `join-pool.md` - Participant onboarding
- [ ] `submit-picks.md` - Pick submission flow
- [ ] `mark-results.md` - Result marking by captain
- [ ] `leaderboard.md` - Live leaderboard

## Out of Scope for MVP

- Edit picks after submission
- Delete props after participants join
- Multiple captains
- Pool templates
- Historical data
- Push notifications

## Success Criteria

- [ ] Captain creates pool in under 5 minutes
- [ ] Participant joins and picks in under 2 minutes
- [ ] Captain updates results live during game
- [ ] Leaderboard shows correct rankings at all times
- [ ] No data loss (picks always saved)

---

**Next Step**: Begin implementation with pool creation
