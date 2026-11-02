const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const RAPIER = require('@dimforge/rapier3d-compat');
let checks = 0;
const check = (value, label) => {assert.ok(value, label); checks++;};

// 使用真实 Rapier 求解接触、摩擦与双币碰撞，不给刚体指定最终落点。
(async () => {
  await RAPIER.init();
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'chutes.js'));
  const {planInsertion} = await import('data:text/javascript;base64,' + source.toString('base64'));
  const left = planInsertion({side: 'left'}), right = planInsertion({side: 'right'});
  check(left.spawn.y === 1.65 && right.spawn.y === 1.65 && left.spawn.z === -4.7 && right.spawn.z === -4.7,
    '普通入口位于上层板面上方与其深度范围内');
  check(left.spawn.x < 0 && right.spawn.x > 0 && left.velocity.x === 9 && right.velocity.x === -9,
    '左右两侧朝相反方向提供水平初速度');

  function simulate(plans, friction) {
    const world = new RAPIER.World({x: 0, y: -24, z: 0});
    world.timestep = 1 / 60;
    world.integrationParameters.numSolverIterations = 4;
    try {
      // 上层平板顶面为1.2，范围覆盖真实入口；没有轨道或预设终点。
      const platform = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, .6, -6));
      const plate = world.createCollider(RAPIER.ColliderDesc.cuboid(5, .6, 3).setFriction(friction), platform);
      const coins = plans.map(plan => {
        const {spawn, velocity} = plan;
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(spawn.x, spawn.y, spawn.z).setLinvel(velocity.x, velocity.y, velocity.z)
          .setLinearDamping(.05).setAngularDamping(.3).setCcdEnabled(true));
        const collider = world.createCollider(RAPIER.ColliderDesc.roundCylinder(.055, .56, .02)
          .setDensity(10).setFriction(friction).setRestitution(.08), body);
        return {body, collider};
      });
      let allDynamic = true, supportContacts = 0, impulse = 0, firstCollision = null;
      const samples = [];
      for (let frame = 0; frame < 60; frame++) {
        world.step();
        allDynamic &&= coins.every(coin => coin.body.isDynamic());
        for (const coin of coins) world.contactPair(plate, coin.collider, manifold => {
          if (manifold.numSolverContacts() > 0) supportContacts++;
        });
        if (coins.length === 2) world.contactPair(coins[0].collider, coins[1].collider, manifold => {
          for (let i = 0; i < manifold.numContacts(); i++) {
            const contactImpulse = manifold.contactImpulse(i);
            impulse += contactImpulse;
            if (contactImpulse > .001 && firstCollision === null) firstCollision = {
              time: (frame + 1) / 60,
              positions: coins.map(coin => coin.body.translation()),
            };
          }
        });
        samples.push({time: (frame + 1) / 60, positions: coins.map(coin => coin.body.translation()),
          velocities: coins.map(coin => coin.body.linvel())});
      }
      return {allDynamic, supportContacts, impulse, firstCollision, samples, final: samples.at(-1)};
    } finally {
      world.free();
    }
  }

  const singleLeft = simulate([left], .32), singleRight = simulate([right], .32);
  for (const [name, result, direction, origin] of [['左侧', singleLeft, 1, left.spawn.x], ['右侧', singleRight, -1, right.spawn.x]]) {
    check(result.allDynamic, name + '普通币全程为动态刚体');
    check(result.samples[11].positions[0].x * direction > origin * direction + 1,
      name + '普通币在短时间内沿上层横向移动');
    check(result.supportContacts > 20, name + '普通币产生持续真实板面支撑接触');
    check(result.samples.slice(15).every(sample => sample.positions[0].y > 1.2 && sample.positions[0].y < 1.5),
      name + '普通币接触上层后保持板面支撑，没有插值飞向下层');
    check(result.samples.slice(15).every(sample => Math.abs(sample.positions[0].z + 4.7) < .12),
      name + '普通币在没有纵向推力时不会自动飞向预写纵深落点');
  }
  check(Math.abs(singleLeft.final.positions[0].x + singleRight.final.positions[0].x) < .15,
    '镜像入口在相同物理环境下产生近似镜像运动');

  const lowFriction = simulate([left], .1), highFriction = simulate([left], .9);
  check(lowFriction.allDynamic && highFriction.allDynamic, '改变摩擦时刚体类型仍为动态');
  check(lowFriction.final.positions[0].x - highFriction.final.positions[0].x > 1,
    '相同初始投币在不同摩擦下得到明显不同位置，轨迹由物理接触决定');
  check(Math.abs(highFriction.final.velocities[0].x) < .2 && lowFriction.final.velocities[0].x > 1,
    '高摩擦使硬币停下而低摩擦继续横滑，速度也由物理求解改变');

  const both = planInsertion({side: 'both'});
  check(both.launches?.length === 2 && !both.spawn, '双投计划展开为两个侧入口，没有中央发射体');
  const pair = simulate(both.launches, .32);
  check(pair.allDynamic, '同时投出的两枚硬币全程保持动态');
  check(pair.firstCollision !== null && pair.firstCollision.time > .2 && pair.firstCollision.time < .9 && pair.impulse > .5,
    '两枚硬币滑行后形成真实接触冲量，碰撞并非在生成时预写');
  check(pair.firstCollision.positions.every(position => Math.abs(position.x) < 1.2), '双币真实碰撞发生在板面中央附近');
  check(pair.final.positions[0].x < pair.final.positions[1].x &&
    pair.final.positions[1].x - pair.final.positions[0].x > 1,
    '碰撞后的两枚硬币保持物理间隔，没有互相穿过');
  check(Math.abs(pair.final.positions[0].x - singleLeft.final.positions[0].x) > .5 &&
    Math.abs(pair.final.positions[1].x - singleRight.final.positions[0].x) > .5,
    '相互碰撞改变双币最终位置，与各自单独发射的结果不同');
  check(pair.final.velocities.every(velocity => Math.abs(velocity.x) < .5) && pair.supportContacts > 40,
    '双币碰撞后明显减速并继续受到上层板面支撑');
  console.log(`PASS: ${checks} 项原生双侧投币物理断言`);
})().catch(error => {console.error(error); process.exitCode = 1;});
